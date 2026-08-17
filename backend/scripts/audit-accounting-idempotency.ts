import 'dotenv/config';

import {
  Client,
} from 'pg';

interface DuplicateRow {
  company_id: string;
  source_type: string;
  source_id: string;
  count: string;
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
    const duplicates =
      await client.query<DuplicateRow>(`
        SELECT
          company_id,
          source_type,
          source_id,
          COUNT(*)::text AS count
        FROM journal_entries
        WHERE
          source_id IS NOT NULL
          AND deleted_at IS NULL
        GROUP BY
          company_id,
          source_type,
          source_id
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      `);

    const indexResult =
      await client.query<{
        indexname: string;
      }>(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'journal_entries'
          AND indexname =
            'UQ_journal_entries_live_source'
      `);

    if (duplicates.rows.length > 0) {
      console.error(
        `Accounting idempotency audit FAILED: ${duplicates.rows.length} duplicate source group(s).`,
      );

      for (const row of duplicates.rows) {
        console.error(
          `- company=${row.company_id} source=${row.source_type}/${row.source_id} journals=${row.count}`,
        );
      }

      process.exitCode = 1;
      return;
    }

    if (indexResult.rows.length !== 1) {
      console.error(
        'Accounting idempotency audit FAILED: unique live-source index is missing.',
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      'Accounting idempotency audit passed: source journals are uniquely protected.',
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
        : 'Accounting idempotency audit failed unexpectedly.',
    );

    process.exitCode = 1;
  },
);
