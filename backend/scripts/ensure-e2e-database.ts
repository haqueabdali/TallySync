import 'dotenv/config';

import {
  Client,
} from 'pg';

function quoteIdentifier(
  value: string,
): string {
  if (
    !/^[A-Za-z0-9_]+$/.test(value)
  ) {
    throw new Error(
      'E2E_DATABASE_NAME may contain only letters, numbers, and underscores.',
    );
  }

  return `"${value.replace(/"/g, '""')}"`;
}

async function main(): Promise<void> {
  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    'tallysync_e2e_test';

  if (
    !/test/i.test(databaseName) ||
    databaseName === 'tallysync_db'
  ) {
    throw new Error(
      `Unsafe E2E database name "${databaseName}". The name must contain "test".`,
    );
  }

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
        process.env.POSTGRES_ADMIN_DATABASE ??
        'postgres',
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
    const existing =
      await client.query<{
        datname: string;
      }>(
        'SELECT datname FROM pg_database WHERE datname = $1',
        [databaseName],
      );

    if (existing.rowCount === 0) {
      await client.query(
        `CREATE DATABASE ${quoteIdentifier(databaseName)}`,
      );

      console.log(
        `Created E2E database "${databaseName}".`,
      );
    } else {
      console.log(
        `E2E database "${databaseName}" already exists.`,
      );
    }
  } finally {
    await client.end();
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Unable to prepare E2E database.',
    );

    process.exitCode = 1;
  },
);
