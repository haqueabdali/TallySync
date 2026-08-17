import 'dotenv/config';

import {
  Client,
} from 'pg';

const paymentColumns = [
  'id',
  'company_id',
  'supplier_id',
  'payment_number',
  'payment_date',
  'payment_method',
  'status',
  'currency',
  'amount',
  'allocated_amount',
  'unallocated_amount',
  'reference_number',
  'bank_account_name',
  'cheque_number',
  'cheque_date',
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

const allocationColumns = [
  'id',
  'supplier_payment_id',
  'purchase_invoice_id',
  'allocated_amount',
  'invoice_balance_before',
  'invoice_balance_after',
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
      (row) => row.column_name,
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
    const payments =
      await columnsFor(
        client,
        'supplier_payments',
      );

    const allocations =
      await columnsFor(
        client,
        'supplier_payment_allocations',
      );

    const failures: string[] = [];

    for (
      const column of paymentColumns
    ) {
      if (!payments.has(column)) {
        failures.push(
          `missing supplier_payments.${column}`,
        );
      }
    }

    for (
      const column of allocationColumns
    ) {
      if (
        !allocations.has(column)
      ) {
        failures.push(
          `missing supplier_payment_allocations.${column}`,
        );
      }
    }

    if (failures.length > 0) {
      console.error(
        'Supplier Payment schema audit FAILED.',
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
      'Supplier Payment schema audit passed.',
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
        : 'Supplier Payment schema audit failed unexpectedly.',
    );

    process.exitCode = 1;
  },
);
