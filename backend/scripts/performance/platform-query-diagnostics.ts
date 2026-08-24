import 'dotenv/config';
import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import dataSource from '../../src/database/data-source';

interface DiagnosticEntry {
  name: string;
  sql: string;
  parameters: unknown[];
  explain: unknown;
}

interface IndexRow {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface TableStatRow {
  tableName: string;
  estimatedRows: string;
}

function requiredLicenseId(): string {
  const value =
    process.env.PERF_LICENSE_ID?.trim() ||
    process.env.LOAD_LICENSE_ID?.trim();

  if (!value) {
    throw new Error(
      'Set PERF_LICENSE_ID or LOAD_LICENSE_ID to an existing license UUID before running diagnostics.',
    );
  }

  return value;
}

async function explain(
  name: string,
  sql: string,
  parameters: unknown[] = [],
): Promise<DiagnosticEntry> {
  const rows = await dataSource.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
    parameters,
  );

  return {
    name,
    sql,
    parameters,
    explain: rows?.[0]?.['QUERY PLAN'] ?? rows,
  };
}

async function main(): Promise<void> {
  const licenseId = requiredLicenseId();
  await dataSource.initialize();

  try {
    const identity = await dataSource.query(
      `SELECT
         current_database() AS "databaseName",
         current_user AS "databaseUser",
         inet_server_addr()::text AS "serverAddress",
         inet_server_port() AS "serverPort",
         version() AS "postgresVersion"`,
    );

    const db = identity[0] as {
      databaseName?: string;
      databaseUser?: string;
      serverAddress?: string | null;
      serverPort?: number | null;
      postgresVersion?: string;
    };

    console.log('TallySync PostgreSQL platform diagnostics');
    console.log(`Database: ${db.databaseName ?? 'unknown'}`);
    console.log(`User: ${db.databaseUser ?? 'unknown'}`);
    console.log(`Server: ${db.serverAddress ?? 'local'}:${db.serverPort ?? 5432}`);
    console.log(`License: ${licenseId}`);

    const licenseExists = await dataSource.query(
      `SELECT id, company_id AS "companyId", status, expires_at AS "expiresAt"
       FROM licenses
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [licenseId],
    );

    if (licenseExists.length === 0) {
      throw new Error(
        `License ${licenseId} does not exist in database ${db.databaseName ?? 'unknown'}.`,
      );
    }

    const companyId = licenseExists[0].companyId as string;

    const tableStats = (await dataSource.query(
      `SELECT
         relname AS "tableName",
         n_live_tup::text AS "estimatedRows"
       FROM pg_stat_user_tables
       WHERE relname IN (
         'licenses',
         'license_features',
         'license_activations',
         'license_sessions',
         'users',
         'companies'
       )
       ORDER BY relname`,
    )) as TableStatRow[];

    const indexes = (await dataSource.query(
      `SELECT schemaname, tablename, indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND tablename IN (
           'licenses',
           'license_features',
           'license_activations',
           'license_sessions',
           'users',
           'companies'
         )
       ORDER BY tablename, indexname`,
    )) as IndexRow[];

    const diagnostics: DiagnosticEntry[] = [];

    diagnostics.push(
      await explain(
        'dashboard.totalLicenses',
        `SELECT COUNT(*)
         FROM licenses
         WHERE deleted_at IS NULL`,
      ),
    );

    diagnostics.push(
      await explain(
        'dashboard.activeLicenses',
        `SELECT COUNT(*)
         FROM licenses
         WHERE status = 'active'
           AND deleted_at IS NULL`,
      ),
    );

    diagnostics.push(
      await explain(
        'dashboard.expiredByDate',
        `SELECT COUNT(*)
         FROM licenses
         WHERE deleted_at IS NULL
           AND expires_at IS NOT NULL
           AND expires_at <= NOW()`,
      ),
    );

    diagnostics.push(
      await explain(
        'dashboard.expiringWithin30Days',
        `SELECT COUNT(*)
         FROM licenses
         WHERE deleted_at IS NULL
           AND expires_at IS NOT NULL
           AND expires_at > NOW()
           AND expires_at <= NOW() + INTERVAL '30 days'
           AND status <> 'revoked'`,
      ),
    );

    diagnostics.push(
      await explain(
        'dashboard.expirationWarningList',
        `SELECT l.id, l.expires_at, c.id, c.name
         FROM licenses l
         LEFT JOIN companies c
           ON c.id = l.company_id
          AND c.deleted_at IS NULL
         WHERE l.deleted_at IS NULL
           AND l.expires_at IS NOT NULL
           AND l.expires_at > NOW()
           AND l.expires_at <= NOW() + INTERVAL '30 days'
           AND l.status <> 'revoked'
         ORDER BY l.expires_at ASC, l.id ASC
         LIMIT 25`,
      ),
    );

    diagnostics.push(
      await explain(
        'usage.licenseLookup',
        `SELECT l.id, l.company_id, l.status, l.max_users, l.max_concurrent_users
         FROM licenses l
         WHERE l.id = $1
           AND l.deleted_at IS NULL
         LIMIT 1`,
        [licenseId],
      ),
    );

    diagnostics.push(
      await explain(
        'usage.activeUsers',
        `SELECT COUNT(*)
         FROM users
         WHERE company_id = $1
           AND status = 'active'
           AND deleted_at IS NULL`,
        [companyId],
      ),
    );

    diagnostics.push(
      await explain(
        'usage.activeActivations',
        `SELECT COUNT(*)
         FROM license_activations
         WHERE license_id = $1
           AND status = 'active'`,
        [licenseId],
      ),
    );

    diagnostics.push(
      await explain(
        'sessions.activeByLicense',
        `SELECT COUNT(*)
         FROM license_sessions
         WHERE license_id = $1
           AND is_revoked = false
           AND expires_at > NOW()`,
        [licenseId],
      ),
    );

    diagnostics.push(
      await explain(
        'sessions.distinctActiveUsersByLicense',
        `SELECT COUNT(DISTINCT user_id)
         FROM license_sessions
         WHERE license_id = $1
           AND is_revoked = false
           AND expires_at > NOW()`,
        [licenseId],
      ),
    );

    const report = {
      generatedAt: new Date().toISOString(),
      database: db,
      selectedLicense: licenseExists[0],
      tableStats,
      indexes,
      diagnostics,
    };

    const outputDir = join(process.cwd(), 'artifacts', 'performance');
    await mkdir(outputDir, { recursive: true });
    const timestamp = report.generatedAt.replace(/[:.]/g, '-');
    const outputPath = join(outputDir, `${timestamp}-platform-query-diagnostics.json`);
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log('Table estimates:');
    for (const table of tableStats) {
      console.log(`- ${table.tableName}: ${table.estimatedRows}`);
    }

    console.log('');
    console.log(`Indexes inspected: ${indexes.length}`);
    console.log(`Queries explained: ${diagnostics.length}`);
    console.log(`Report: ${outputPath}`);
    console.log('No schema or data changes were performed.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
