import 'dotenv/config';

import {
  Client,
} from 'pg';

const expectedColumns = [
  'id',
  'company_id',
  'category_id',
  'sku',
  'barcode',
  'name',
  'description',
  'unit',
  'purchase_price',
  'selling_price',
  'tax_rate',
  'opening_stock',
  'current_stock',
  'minimum_stock',
  'track_inventory',
  'hsn_code',
  'tally_stock_item_id',
  'tally_item_name',
  'sync_status',
  'sync_error',
  'last_synced_at',
  'is_active',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

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
    const result =
      await client.query<{
        column_name: string;
      }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'items'
      `);

    const actual =
      new Set(
        result.rows.map(
          (row) =>
            row.column_name,
        ),
      );

    const missing =
      expectedColumns.filter(
        (column) =>
          !actual.has(column),
      );

    if (missing.length > 0) {
      console.error(
        'Items schema audit FAILED.',
      );

      for (const column of missing) {
        console.error(
          `- missing items.${column}`,
        );
      }

      process.exitCode = 1;
      return;
    }

    console.log(
      `Items schema audit passed (${expectedColumns.length} canonical columns found).`,
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
        : 'Items schema audit failed unexpectedly.',
    );

    process.exitCode = 1;
  },
);
