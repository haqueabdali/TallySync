import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { ProductionOrdersService } from '../src/production-orders/production-orders.service';
import { ProductionOrderStatus } from '../src/production-orders/enums/production-order-status.enum';
import { ProductionVarianceService } from '../src/production-variance/production-variance.service';
import { ProductionVarianceStatus } from '../src/production-variance/enums/production-variance-status.enum';

type IdRow = { id: string };
type CountRow = { count: string };

async function insertId(
  db: DataSource,
  sql: string,
  parameters: unknown[],
): Promise<string> {
  const rows = await db.query<IdRow[]>(sql, parameters);
  const id = rows[0]?.id;
  if (!id) throw new Error('Insert did not return an id.');
  return id;
}

describe('Manufacturing Core Lifecycle (e2e)', () => {
  jest.setTimeout(120_000);

  let app: INestApplicationContext;
  let db: DataSource;
  let productionOrdersService: ProductionOrdersService;
  let productionVarianceService: ProductionVarianceService;
  let companyId: string | undefined;

  const actorId = '00000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    const requestedDatabase =
      process.env.E2E_DATABASE_NAME ??
      process.env.DATABASE_NAME ??
      'tallysync_e2e_test';

    process.env.DATABASE_NAME = requestedDatabase;

    app = await NestFactory.createApplicationContext(AppModule, {
      abortOnError: false,
      logger: ['error'],
    });

    db = app.get(DataSource);

    const current = await db.query<Array<{ database: string }>>(
      'SELECT current_database() AS database',
    );

    expect(current[0]?.database).toBe(requestedDatabase);

    productionOrdersService = app.get(ProductionOrdersService);
    productionVarianceService = app.get(ProductionVarianceService);
  });

  afterAll(async () => {
    if (db && companyId) {
      const cleanup: Array<[string, unknown[]]> = [
        [
          `DELETE FROM journal_entry_lines
           WHERE journal_entry_id IN (
             SELECT id FROM journal_entries WHERE company_id = $1
           )`,
          [companyId],
        ],
        ['DELETE FROM journal_entries WHERE company_id = $1', [companyId]],
        [
          `DELETE FROM production_variance_lines
           WHERE production_variance_id IN (
             SELECT id FROM production_variances WHERE company_id = $1
           )`,
          [companyId],
        ],
        ['DELETE FROM production_variances WHERE company_id = $1', [companyId]],
        ['DELETE FROM manufacturing_wip_postings WHERE company_id = $1', [companyId]],
        [
          `DELETE FROM production_order_components
           WHERE production_order_id IN (
             SELECT id FROM production_orders WHERE company_id = $1
           )`,
          [companyId],
        ],
        ['DELETE FROM production_orders WHERE company_id = $1', [companyId]],
        [
          `DELETE FROM bill_of_material_components
           WHERE bill_of_material_id IN (
             SELECT id FROM bills_of_material WHERE company_id = $1
           )`,
          [companyId],
        ],
        ['DELETE FROM bills_of_material WHERE company_id = $1', [companyId]],
        ['DELETE FROM manufacturing_wip_accounting_settings WHERE company_id = $1', [companyId]],
        ['DELETE FROM accounting_settings WHERE company_id = $1', [companyId]],
        ['DELETE FROM items WHERE company_id = $1', [companyId]],
        ['DELETE FROM warehouses WHERE company_id = $1', [companyId]],
        ['DELETE FROM accounts WHERE company_id = $1', [companyId]],
        ['DELETE FROM companies WHERE id = $1', [companyId]],
      ];

      for (const [sql, params] of cleanup) {
        await db.query(sql, params);
      }
    }

    if (app) await app.close();
  });

  it(
    'runs DRAFT -> RELEASED -> IN_PROGRESS -> COMPLETED with retry-safe accounting and variance',
    async () => {
      const token = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      companyId = await insertId(
        db,
        `INSERT INTO companies (name, tally_company_name)
         VALUES ($1, $2)
         RETURNING id`,
        [`MFG CORE E2E ${token}`, `MFG-CORE-${token}`],
      );

      const accountTypes = await db.query<Array<{ value: string }>>(
        `SELECT e.enumlabel AS value
         FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'accounts_type_enum'
         ORDER BY e.enumsortorder`,
      );

      const normalBalances = await db.query<Array<{ value: string }>>(
        `SELECT e.enumlabel AS value
         FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'accounts_normal_balance_enum'
         ORDER BY e.enumsortorder`,
      );

      const assetType =
        accountTypes.map((r) => r.value).find((v) => v.toLowerCase() === 'asset') ??
        accountTypes[0]?.value;
      const expenseType =
        accountTypes.map((r) => r.value).find((v) => v.toLowerCase() === 'expense') ??
        assetType;
      const debitBalance =
        normalBalances.map((r) => r.value).find((v) => v.toLowerCase() === 'debit') ??
        normalBalances[0]?.value;

      if (!assetType || !expenseType || !debitBalance) {
        throw new Error('Could not resolve account enum values.');
      }

      const createAccount = (
        code: string,
        name: string,
        type: string,
      ): Promise<string> =>
        insertId(
          db,
          `INSERT INTO accounts (
             company_id, code, name, type, normal_balance
           )
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [companyId, code, name, type, debitBalance],
        );

      const rawMaterialsAccountId = await createAccount(
        `RM-${token}`,
        'Raw Materials',
        assetType,
      );
      const wipAccountId = await createAccount(
        `WIP-${token}`,
        'Work In Progress',
        assetType,
      );
      const finishedGoodsAccountId = await createAccount(
        `FG-${token}`,
        'Finished Goods',
        assetType,
      );
      const varianceAccountId = await createAccount(
        `VAR-${token}`,
        'Manufacturing Variance',
        expenseType,
      );

      await db.query(
        `INSERT INTO accounting_settings (
           company_id,
           raw_materials_inventory_account_id,
           work_in_progress_account_id,
           finished_goods_inventory_account_id,
           manufacturing_variance_account_id,
           auto_post_material_consumption,
           auto_post_production_completion,
           auto_post_production_variance
         )
         VALUES ($1, $2, $3, $4, $5, true, true, true)`,
        [
          companyId,
          rawMaterialsAccountId,
          wipAccountId,
          finishedGoodsAccountId,
          varianceAccountId,
        ],
      );

      await db.query(
        `INSERT INTO manufacturing_wip_accounting_settings (
           company_id, wip_account_id
         )
         VALUES ($1, $2)`,
        [companyId, wipAccountId],
      );

      const warehouseId = await insertId(
        db,
        `INSERT INTO warehouses (
           company_id, warehouse_code, name
         )
         VALUES ($1, $2, $3)
         RETURNING id`,
        [companyId, `WH-${token}`, 'Core Lifecycle Warehouse'],
      );

      const finishedItemId = await insertId(
        db,
        `INSERT INTO items (company_id, name)
         VALUES ($1, $2)
         RETURNING id`,
        [companyId, `Finished Item ${token}`],
      );

      const componentItemId = await insertId(
        db,
        `INSERT INTO items (company_id, name)
         VALUES ($1, $2)
         RETURNING id`,
        [companyId, `Component Item ${token}`],
      );

      const bomId = await insertId(
        db,
        `INSERT INTO bills_of_material (
           company_id,
           finished_item_id,
           code,
           name,
           output_quantity
         )
         VALUES ($1, $2, $3, $4, 10)
         RETURNING id`,
        [companyId, finishedItemId, `BOM-${token}`, `Core Lifecycle BOM ${token}`],
      );

      await db.query(
        `INSERT INTO bill_of_material_components (
           bill_of_material_id,
           component_item_id,
           quantity
         )
         VALUES ($1, $2, 2)`,
        [bomId, componentItemId],
      );

      const orderId = await insertId(
        db,
        `INSERT INTO production_orders (
           company_id,
           order_number,
           bill_of_material_id,
           finished_item_id,
           warehouse_id,
           planned_quantity,
           completed_quantity,
           status,
           actual_material_cost,
           actual_labor_cost,
           actual_overhead_cost,
           actual_total_cost
         )
         VALUES (
           $1, $2, $3, $4, $5,
           10, 0, $6,
           80, 10, 10, 0
         )
         RETURNING id`,
        [
          companyId,
          `PO-${token}`,
          bomId,
          finishedItemId,
          warehouseId,
          ProductionOrderStatus.DRAFT,
        ],
      );

      await db.query(
        `INSERT INTO production_order_components (
           production_order_id,
           component_item_id,
           bom_quantity,
           required_quantity,
           consumed_quantity
         )
         VALUES ($1, $2, 2, 2, 2)`,
        [orderId, componentItemId],
      );

      const draft = await productionOrdersService.findOne(orderId, companyId);
      expect(draft.status).toBe(ProductionOrderStatus.DRAFT);

      const released = await productionOrdersService.release(
        orderId,
        companyId,
        actorId,
      );
      expect(released.status).toBe(ProductionOrderStatus.RELEASED);

      const started = await productionOrdersService.start(
        orderId,
        companyId,
        actorId,
      );
      expect(started.status).toBe(ProductionOrderStatus.IN_PROGRESS);

      const completed = await productionOrdersService.complete(
        orderId,
        companyId,
        actorId,
      );
      expect(completed.status).toBe(ProductionOrderStatus.COMPLETED);
      expect(Number(completed.completedQuantity)).toBe(10);

      const costRows = await db.query<
        Array<{ actual_total_cost: string | number }>
      >(
        `SELECT actual_total_cost
         FROM production_orders
         WHERE id = $1`,
        [orderId],
      );

      expect(Number(costRows[0]?.actual_total_cost)).toBe(100);

      const retried = await productionOrdersService.complete(
        orderId,
        companyId,
        actorId,
      );
      expect(retried.status).toBe(ProductionOrderStatus.COMPLETED);

      const completionJournals = await db.query<CountRow[]>(
        `SELECT COUNT(*)::text AS count
         FROM journal_entries
         WHERE company_id = $1
           AND source_id = $2
           AND source_type = 'production_completion'
           AND deleted_at IS NULL`,
        [companyId, orderId],
      );

      expect(Number(completionJournals[0]?.count ?? 0)).toBe(1);

      const variance = await productionVarianceService.calculate(
        companyId,
        actorId,
        orderId,
        {
          varianceDate: new Date().toISOString().slice(0, 10),
        },
      );

      expect(variance.productionOrderId).toBe(orderId);
      expect(Number(variance.wipVariance)).toBe(0);

      const postedVariance = await productionVarianceService.post(
        companyId,
        actorId,
        variance.id,
      );

      expect(postedVariance.status).toBe(ProductionVarianceStatus.POSTED);

      await expect(
        productionVarianceService.calculate(
          companyId,
          actorId,
          orderId,
          {},
        ),
      ).rejects.toThrow(
        'Production variance has already been calculated',
      );
    },
  );
});