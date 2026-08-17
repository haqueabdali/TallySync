import 'dotenv/config';

import {
  Client,
} from 'pg';

const expectedColumns = [
  'id',
  'company_id',
  'supplier_code',
  'name',
  'company_name',
  'contact_person',
  'email',
  'phone',
  'mobile',
  'tax_number',
  'vat_number',
  'billing_address',
  'shipping_address',
  'city',
  'state',
  'postal_code',
  'country',
  'credit_limit',
  'opening_balance',
  'current_balance',
  'currency',
  'payment_terms',
  'notes',
  'is_active',
  'created_by',
  'updated_by',
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
          AND table_name = 'suppliers'
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
        'Supplier schema audit FAILED.',
      );

      for (const column of missing) {
        console.error(
          `- missing suppliers.${column}`,
        );
      }

      process.exitCode = 1;
      return;
    }

    const duplicateCodes =
      await client.query<{
        company_id: string;
        supplier_code: string;
        count: string;
      }>(`
        SELECT
          company_id,
          supplier_code,
          COUNT(*)::text AS count
        FROM suppliers
        WHERE deleted_at IS NULL
        GROUP BY
          company_id,
          supplier_code
        HAVING COUNT(*) > 1
      `);

    if (duplicateCodes.rowCount) {
      console.error(
        'Supplier schema audit FAILED: duplicate live supplier codes exist.',
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `Supplier schema audit passed (${expectedColumns.length} canonical columns found).`,
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
        : 'Supplier schema audit failed unexpectedly.',
    );

    process.exitCode = 1;
  },
);
