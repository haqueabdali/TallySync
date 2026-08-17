import 'dotenv/config';

import {
  Client,
} from 'pg';

const invoiceColumns = [
  'id',
  'company_id',
  'supplier_id',
  'purchase_order_id',
  'goods_receipt_id',
  'invoice_number',
  'supplier_invoice_number',
  'invoice_date',
  'due_date',
  'status',
  'currency',
  'subtotal',
  'discount_total',
  'tax_total',
  'shipping_total',
  'grand_total',
  'paid_amount',
  'balance_due',
  'billing_address',
  'notes',
  'created_by',
  'updated_by',
  'posted_by',
  'posted_at',
  'cancelled_by',
  'cancelled_at',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

const itemColumns = [
  'id',
  'purchase_invoice_id',
  'item_id',
  'purchase_order_item_id',
  'goods_receipt_item_id',
  'item_name',
  'sku',
  'unit',
  'description',
  'quantity',
  'unit_cost',
  'discount_percent',
  'tax_percent',
  'line_subtotal',
  'discount_amount',
  'tax_amount',
  'line_total',
] as const;

async function columnsFor(
  client: Client,
  table: string,
): Promise<Set<string>> {
  const result =
    await client.query<{
      column_name: string;
    }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
      [table],
    );

  return new Set(
    result.rows.map(
      (row) =>
        row.column_name,
    ),
  );
}

async function main(): Promise<void> {
  const client =
    new Client({
      host:
        process.env.DATABASE_HOST ??
        'localhost',
      port: Number(
        process.env.DATABASE_PORT ??
          5432,
      ),
      user:
        process.env.DATABASE_USER ??
        'postgres',
      password:
        process.env.DATABASE_PASSWORD,
      database:
        process.env.E2E_DATABASE_NAME ??
        process.env.DATABASE_NAME ??
        'tallysync_db',
      ssl:
        process.env.DATABASE_SSL ===
        'true'
          ? {
              rejectUnauthorized:
                process.env
                  .DATABASE_SSL_REJECT_UNAUTHORIZED !==
                'false',
            }
          : false,
    });

  await client.connect();

  try {
    const invoices =
      await columnsFor(
        client,
        'purchase_invoices',
      );

    const items =
      await columnsFor(
        client,
        'purchase_invoice_items',
      );

    const failures: string[] = [];

    for (
      const column of invoiceColumns
    ) {
      if (
        !invoices.has(column)
      ) {
        failures.push(
          `missing purchase_invoices.${column}`,
        );
      }
    }

    for (
      const column of itemColumns
    ) {
      if (!items.has(column)) {
        failures.push(
          `missing purchase_invoice_items.${column}`,
        );
      }
    }

    const enumResult =
      await client.query<{
        enumlabel: string;
      }>(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e
          ON e.enumtypid = t.oid
        WHERE t.typname =
          'purchase_invoices_status_enum'
      `);

    const enumValues =
      new Set(
        enumResult.rows.map(
          (row) =>
            row.enumlabel,
        ),
      );

    for (
      const required of [
        'Draft',
        'Posted',
        'PartiallyPaid',
        'Paid',
        'Cancelled',
      ]
    ) {
      if (
        !enumValues.has(required)
      ) {
        failures.push(
          `purchase_invoices_status_enum missing "${required}"`,
        );
      }
    }

    if (failures.length > 0) {
      console.error(
        'Purchase Invoice schema audit FAILED.',
      );

      for (
        const failure of failures
      ) {
        console.error(
          `- ${failure}`,
        );
      }

      process.exitCode = 1;
      return;
    }

    console.log(
      'Purchase Invoice schema audit passed.',
    );
  } finally {
    await client.end();
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Purchase Invoice schema audit failed unexpectedly.',
    );

    process.exitCode = 1;
  },
);
