import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DataSource } from 'typeorm';

type EntityInfo = {
  file: string;
  exists: boolean;
  tableName: string | null;
};

function loadDataSource(): DataSource {
  const loaded = require('../../src/database/data-source') as { default?: DataSource };
  if (!loaded.default) {
    throw new Error('No default DataSource export found.');
  }
  return loaded.default;
}

function inspectEntity(file: string): EntityInfo {
  const full = resolve(process.cwd(), file);
  if (!existsSync(full)) {
    return { file, exists: false, tableName: null };
  }
  const text = readFileSync(full, 'utf8');
  const match = text.match(/@Entity\s*\(\s*['\"`]([^'\"`]+)['\"`]\s*\)/);
  return {
    file,
    exists: true,
    tableName: match?.[1] ?? null,
  };
}

async function main(): Promise<void> {
  const dbName =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_e2e_test';

  process.env.DATABASE_NAME = dbName;

  const entities = [
    inspectEntity('src/bill-of-materials/entities/bill-of-material.entity.ts'),
    inspectEntity('src/bill-of-materials/entities/bill-of-material-component.entity.ts'),
    inspectEntity('src/manufacturing-wip-accounting/entities/wip-posting.entity.ts'),
    inspectEntity('src/manufacturing-wip-accounting/entities/wip-accounting-settings.entity.ts'),
  ];

  const ds = loadDataSource();
  if (!ds.isInitialized) {
    await ds.initialize();
  }

  try {
    const db = await ds.query(`SELECT current_database() AS database`);

    const tables = await ds.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (
          table_name ILIKE '%bill%'
          OR table_name ILIKE '%bom%'
          OR table_name ILIKE '%wip%'
          OR table_name ILIKE '%manufactur%'
          OR table_name ILIKE '%production%'
          OR table_name ILIKE '%material%'
        )
      ORDER BY table_name
    `);

    const migrations = await ds.query(`
      SELECT id, timestamp, name
      FROM typeorm_migrations
      WHERE
        name ILIKE '%bill%'
        OR name ILIKE '%bom%'
        OR name ILIKE '%wip%'
        OR name ILIKE '%manufactur%'
        OR name ILIKE '%production%'
        OR name ILIKE '%material%'
      ORDER BY id
    `);

    const foreignKeys = await ds.query(`
      SELECT
        c.relname AS table_name,
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND con.contype = 'f'
        AND (
          c.relname ILIKE '%bill%'
          OR c.relname ILIKE '%bom%'
          OR c.relname ILIKE '%wip%'
          OR c.relname ILIKE '%manufactur%'
          OR c.relname ILIKE '%production%'
          OR c.relname ILIKE '%material%'
        )
      ORDER BY c.relname, con.conname
    `);

    const tableNames = tables.map((row: { table_name: string }) => row.table_name);

    const report = {
      generatedAt: new Date().toISOString(),
      connectedDatabase: db[0]?.database ?? null,
      entities: entities.map((entity) => ({
        ...entity,
        tablePresent:
          entity.tableName !== null &&
          tableNames.includes(entity.tableName),
      })),
      tables,
      migrations,
      foreignKeys,
    };

    const outDir = resolve(process.cwd(), 'artifacts');
    mkdirSync(outDir, { recursive: true });

    writeFileSync(
      resolve(outDir, 'manufacturing-table-discovery.json'),
      JSON.stringify(report, null, 2),
      'utf8',
    );

    const md: string[] = [
      '# Manufacturing Table Discovery',
      '',
      `Connected DB: \`${report.connectedDatabase ?? 'unknown'}\``,
      '',
      '## Entity-declared tables',
      '',
      ...report.entities.flatMap((entity) => [
        `- \`${entity.file}\` → \`${entity.tableName ?? 'not detected'}\` → present=${entity.tablePresent}`,
      ]),
      '',
      '## Matching DB tables',
      '',
      ...(tables.length
        ? tables.map((row: { table_name: string }) => `- \`${row.table_name}\``)
        : ['_None_']),
      '',
      '## Matching migration history',
      '',
      ...(migrations.length
        ? migrations.map((row: { id: number; timestamp: string; name: string }) =>
            `- ${row.id}: \`${row.name}\` (${row.timestamp})`)
        : ['_None_']),
      '',
      '## Related foreign keys',
      '',
      ...(foreignKeys.length
        ? foreignKeys.map((row: { table_name: string; constraint_name: string; definition: string }) =>
            `- \`${row.table_name}.${row.constraint_name}\`: \`${row.definition}\``)
        : ['_None_']),
      '',
    ];

    writeFileSync(
      resolve(outDir, 'manufacturing-table-discovery.md'),
      md.join('\n'),
      'utf8',
    );

    console.log(
      `Manufacturing table discovery complete: tables=${tables.length}, migrations=${migrations.length}`,
    );
    console.log('- artifacts/manufacturing-table-discovery.json');
    console.log('- artifacts/manufacturing-table-discovery.md');
  } finally {
    if (ds.isInitialized) {
      await ds.destroy();
    }
  }
}

main().catch((error: unknown) => {
  console.error('Manufacturing table discovery FAILED.');
  console.error(error);
  process.exitCode = 1;
});