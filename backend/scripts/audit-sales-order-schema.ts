import 'dotenv/config';

import {
  Client,
} from 'pg';

interface ColumnRow {
  column_name: string;
  is_nullable: 'YES' | 'NO';
  data_type: string;
  udt_name: string;
}

interface EnumRow {
  enumlabel: string;
}

async function main(): Promise<void> {
  const database =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_db';

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
      database,
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
    const columns =
      await client.query<ColumnRow>(`
        SELECT
          column_name,
          is_nullable,
          data_type,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'sales_orders',
            'sales_order_items'
          )
      `);

    const byName =
  new Map<string, ColumnRow>(
    columns.rows.map(
      (row): [string, ColumnRow] => [
        row.column_name,
        row,
      ],
    ),
  );

    const itemName =
      byName.get('item_name');

    const unit =
      byName.get('unit');

    const failures: string[] = [];

    if (
      !itemName ||
      itemName.is_nullable !== 'YES'
    ) {
      failures.push(
        'sales_order_items.item_name must be nullable',
      );
    }

    if (
      !unit ||
      unit.is_nullable !== 'YES'
    ) {
      failures.push(
        'sales_order_items.unit must be nullable',
      );
    }

    const statusEnum =
      await client.query<EnumRow>(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e
          ON e.enumtypid = t.oid
        WHERE t.typname =
          'sales_order_status_enum'
        ORDER BY e.enumsortorder
      `);

    const statusValues =
      new Set(
        statusEnum.rows.map(
          (row) => row.enumlabel,
        ),
      );

    for (
      const required of [
        'draft',
        'submitted',
        'approved',
        'confirmed',
        'partially_delivered',
        'delivered',
        'fulfilled',
        'cancelled',
      ]
    ) {
      if (
        !statusValues.has(required)
      ) {
        failures.push(
          `sales_order_status_enum missing "${required}"`,
        );
      }
    }

    const syncEnum =
      await client.query<EnumRow>(`
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e
          ON e.enumtypid = t.oid
        WHERE t.typname =
          'sales_order_sync_status_enum'
        ORDER BY e.enumsortorder
      `);

    const syncValues =
      new Set(
        syncEnum.rows.map(
          (row) => row.enumlabel,
        ),
      );

    for (
      const required of [
        'pending',
        'syncing',
        'synced',
        'failed',
      ]
    ) {
      if (
        !syncValues.has(required)
      ) {
        failures.push(
          `sales_order_sync_status_enum missing "${required}"`,
        );
      }
    }

    if (failures.length > 0) {
      console.error(
        'Sales Order schema audit FAILED.',
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
      'Sales Order schema audit passed.',
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
        : 'Sales Order schema audit failed unexpectedly.',
    );

    process.exitCode = 1;
  },
);
