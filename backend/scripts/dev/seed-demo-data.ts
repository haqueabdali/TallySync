/**
 * Development-only demo data so the admin dashboard and mobile app have
 * something to show. Idempotent: does nothing if demo customers already exist.
 *
 *   npm run seed:demo
 *
 * Refuses to run when NODE_ENV=production.
 */
import 'dotenv/config';

import { DataSource } from 'typeorm';

import { ensureE2ECommercialLicense } from '../../test/helpers/ensure-e2e-commercial-license';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: dataSource } = require('../../src/database/data-source') as {
  default: DataSource;
};

const CUSTOMERS = [
  'Al Noor Trading',
  'Gulf Star Retail',
  'Blue Horizon LLC',
  'Desert Rose Foods',
  'Metro Supplies',
  'Falcon Hardware',
];
const SUPPLIERS = ['Prime Source Ltd', 'Orion Wholesale', 'Summit Materials'];
const ITEMS: Array<[string, string, number, number, number]> = [
  // name, sku, price, stock, minimum
  ['Steel Bracket 40mm', 'SB-040', 12.5, 480, 100],
  ['Copper Wire 2.5mm (100m)', 'CW-025', 64, 22, 30],
  ['LED Panel 60W', 'LP-060', 89, 140, 40],
  ['Industrial Fan 24"', 'IF-024', 210, 9, 12],
  ['Safety Gloves (pair)', 'SG-001', 4.75, 900, 200],
  ['Hydraulic Pump HP-3', 'HP-003', 640, 6, 8],
  ['PVC Pipe 4" (6m)', 'PP-004', 18, 320, 80],
  ['Control Panel CP-9', 'CP-009', 1250, 14, 5],
];

const pick = <T>(list: T[], i: number): T => list[i % list.length];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data in production.');
  }
  await dataSource.initialize();
  const q = async <T = Record<string, unknown>>(
    sql: string,
    p: unknown[] = [],
  ) => await dataSource.query<T[]>(sql, p);

  try {
    const company = (
      await q<{ id: string }>(
        `SELECT c.id FROM companies c
           JOIN users u ON u.company_id = c.id
          WHERE u.deleted_at IS NULL ORDER BY c.created_at LIMIT 1`,
      )
    )[0];
    if (!company)
      throw new Error('Run "npm run seed" first (no company found).');
    const companyId = company.id;

    // Dev convenience: an all-module active licence so the web and mobile app work immediately.
    const admin = (
      await q<{ id: string }>(
        `SELECT id FROM users WHERE company_id=$1 AND deleted_at IS NULL ORDER BY created_at LIMIT 1`,
        [companyId],
      )
    )[0];
    if (admin) {
      await ensureE2ECommercialLicense(dataSource, companyId, admin.id);
      console.log('Active all-module demo licence ensured.');
    }

    const existing = await q(
      `SELECT 1 FROM customers WHERE company_id=$1 AND name=$2 LIMIT 1`,
      [companyId, CUSTOMERS[0]],
    );
    if (existing.length) {
      console.log('Demo data already present; nothing to do.');
      return;
    }

    await dataSource.transaction(async (tx) => {
      const run = async <T = Record<string, unknown>>(
        sql: string,
        p: unknown[] = [],
      ) => await tx.query<T[]>(sql, p);

      const wh =
        (
          await run<{ id: string }>(
            `INSERT INTO warehouses (company_id, warehouse_code, name)
           VALUES ($1,'DEMO-MAIN','Main Warehouse')
           ON CONFLICT DO NOTHING RETURNING id`,
            [companyId],
          )
        )[0] ??
        (
          await run<{ id: string }>(
            `SELECT id FROM warehouses WHERE company_id=$1 AND deleted_at IS NULL LIMIT 1`,
            [companyId],
          )
        )[0];

      const customerIds: string[] = [];
      for (const [i, name] of CUSTOMERS.entries()) {
        const row = await run<{ id: string }>(
          `INSERT INTO customers (company_id, name, email, phone)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [companyId, name, `buyer${i + 1}@demo.test`, `+9715000000${i}`],
        );
        customerIds.push(row[0].id);
      }

      const supplierIds: string[] = [];
      for (const [i, name] of SUPPLIERS.entries()) {
        const row = await run<{ id: string }>(
          `INSERT INTO suppliers (company_id, name, supplier_code)
           VALUES ($1,$2,$3) RETURNING id`,
          [companyId, name, `DEMO-SUP-${i + 1}`],
        );
        supplierIds.push(row[0].id);
      }

      const items: Array<{
        id: string;
        name: string;
        sku: string;
        price: number;
      }> = [];
      for (const [name, sku, price, stock, min] of ITEMS) {
        const row = await run<{ id: string }>(
          `INSERT INTO items (company_id, name, sku, selling_price, current_stock, minimum_stock, track_inventory, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true,true) RETURNING id`,
          [companyId, name, sku, price, stock, min],
        );
        items.push({ id: row[0].id, name, sku, price });
      }

      const statuses = [
        'fulfilled',
        'delivered',
        'confirmed',
        'approved',
        'submitted',
        'draft',
        'cancelled',
      ];
      const sync = ['synced', 'synced', 'synced', 'pending', 'failed'];
      let seq = 1;
      for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
        const count = 5 + (6 - monthsAgo) * 2; // growth trend
        for (let n = 0; n < count; n += 1) {
          const day = 1 + ((n * 3 + monthsAgo) % 27);
          const status = pick(statuses, seq * 3 + n);
          const lines = 1 + (seq % 3);
          let subtotal = 0;
          const lineRows: Array<[string, number, number, number]> = [];
          for (let l = 0; l < lines; l += 1) {
            const item = pick(items, seq + l * 2);
            const qty = 1 + ((seq + l) % 6);
            const total = Math.round(qty * item.price * 100) / 100;
            subtotal += total;
            lineRows.push([item.id, qty, item.price, total]);
          }
          const order = await run<{ id: string }>(
            `INSERT INTO sales_orders
               (company_id, customer_id, order_number, order_date, warehouse_id, status,
                sync_status, subtotal, grand_total, currency)
             VALUES ($1,$2,$3,
               (date_trunc('month', CURRENT_DATE) - ($4::int * INTERVAL '1 month') + (($5::int - 1) * INTERVAL '1 day'))::date,
               $6,$7,$8,$9,$9,'AED')
             RETURNING id`,
            [
              companyId,
              pick(customerIds, seq + n),
              `DEMO-SO-${String(seq).padStart(4, '0')}`,
              monthsAgo,
              day,
              wh.id,
              status,
              pick(sync, seq),
              subtotal,
            ],
          );
          for (const [itemId, qty, price, total] of lineRows) {
            await run(
              `INSERT INTO sales_order_items
                 (sales_order_id, item_id, quantity, unit_price, line_subtotal, line_total)
               VALUES ($1,$2,$3,$4,$5,$5)`,
              [order[0].id, itemId, qty, price, total],
            );
          }
          seq += 1;
        }
      }

      const poStatus = [
        'received',
        'received',
        'sent',
        'partially_received',
        'draft',
      ];
      for (let i = 0; i < 14; i += 1) {
        const total = 800 + ((i * 377) % 4200);
        await run(
          `INSERT INTO purchase_orders
             (company_id, supplier_id, warehouse_id, po_number, po_date, status, subtotal, grand_total, currency)
           VALUES ($1,$2,$3,$4,
             (CURRENT_DATE - ($5::int * INTERVAL '13 day'))::date,$6,$7,$7,'AED')`,
          [
            companyId,
            pick(supplierIds, i),
            wh.id,
            `DEMO-PO-${String(i + 1).padStart(4, '0')}`,
            i,
            pick(poStatus, i),
            total,
          ],
        );
      }
    });

    console.log(
      'Demo data created: 6 customers, 3 suppliers, 8 items, sales and purchase orders.',
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
