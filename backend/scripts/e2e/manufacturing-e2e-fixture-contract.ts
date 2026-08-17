import {
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';
import type {
  DataSource,
} from 'typeorm';

type ColumnRow = {
  table_name: string;
  column_name: string;
  is_nullable: 'YES' | 'NO';
  data_type: string;
  udt_name: string;
  column_default: string | null;
};

type ConstraintRow = {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  definition: string | null;
};

type IndexRow = {
  tablename: string;
  indexname: string;
  indexdef: string;
};

const requiredTables = [
  'companies',
  'users',
  'accounts',
  'accounting_settings',
  'warehouses',
  'items',
  'categories',
  'bills_of_material',
  'bill_of_material_components',
  'production_orders',
  'production_order_components',
  'material_consumptions',
  'material_consumption_lines',
  'manufacturing_wip_accounting_settings',
  'manufacturing_wip_postings',
  'production_variances',
  'production_variance_lines',
  'journal_entries',
  'journal_entry_lines',
];

function loadDataSource(): DataSource {
  const loaded = require(
    '../../src/database/data-source',
  ) as {
    default?: DataSource;
  };

  const dataSource =
    loaded.default;

  if (
    !dataSource ||
    typeof dataSource.initialize !==
      'function' ||
    typeof dataSource.query !==
      'function'
  ) {
    throw new Error(
      'src/database/data-source default export is not a TypeORM DataSource.',
    );
  }

  return dataSource;
}

async function main(): Promise<void> {
  const requestedDatabase =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_e2e_test';

  process.env.DATABASE_NAME =
    requestedDatabase;

  const dataSource =
    loadDataSource();

  if (
    !dataSource.isInitialized
  ) {
    await dataSource.initialize();
  }

  try {
    const current =
      await dataSource.query<
        Array<{
          database: string;
          schema: string;
        }>
      >(
        `
        SELECT
          current_database() AS database,
          current_schema() AS schema
        `,
      );

    const columns =
      await dataSource.query<
        ColumnRow[]
      >(
        `
        SELECT
          table_name,
          column_name,
          is_nullable,
          data_type,
          udt_name,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name, ordinal_position
        `,
        [requiredTables],
      );

    const constraints =
      await dataSource.query<
        ConstraintRow[]
      >(
        `
        SELECT
          c.relname AS table_name,
          con.conname AS constraint_name,
          CASE con.contype
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'u' THEN 'UNIQUE'
            WHEN 'c' THEN 'CHECK'
            ELSE con.contype::text
          END AS constraint_type,
          pg_get_constraintdef(con.oid) AS definition
        FROM pg_constraint con
        JOIN pg_class c
          ON c.oid = con.conrelid
        JOIN pg_namespace n
          ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname, con.conname
        `,
        [requiredTables],
      );

    const indexes =
      await dataSource.query<
        IndexRow[]
      >(
        `
        SELECT
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
        ORDER BY tablename, indexname
        `,
        [requiredTables],
      );

    const missingTables =
      requiredTables.filter(
        (table) =>
          !columns.some(
            (column) =>
              column.table_name ===
              table,
          ),
      );

    const requiredFixtureFields =
      requiredTables.reduce<
        Record<string, ColumnRow[]>
      >(
        (result, table) => {
          result[table] =
            columns.filter(
              (column) =>
                column.table_name ===
                  table &&
                column.is_nullable ===
                  'NO' &&
                column.column_default ===
                  null,
            );

          return result;
        },
        {},
      );

    const report = {
      generatedAt:
        new Date().toISOString(),
      requestedDatabase,
      current:
        current[0] ?? null,
      missingTables,
      requiredFixtureFields,
      columns,
      constraints,
      indexes,
    };

    const artifactsDir =
      resolve(
        process.cwd(),
        'artifacts',
      );

    mkdirSync(
      artifactsDir,
      {
        recursive: true,
      },
    );

    writeFileSync(
      resolve(
        artifactsDir,
        'manufacturing-e2e-fixture-contract.json',
      ),
      JSON.stringify(
        report,
        null,
        2,
      ),
      'utf8',
    );

    const markdown: string[] = [
      '# Manufacturing E2E Fixture Contract',
      '',
      `Generated: ${report.generatedAt}`,
      '',
      `Requested database: \`${requestedDatabase}\``,
      '',
      `Connected database: \`${report.current?.database ?? 'unknown'}\``,
      '',
      `Schema: \`${report.current?.schema ?? 'unknown'}\``,
      '',
    ];

    if (
      missingTables.length
    ) {
      markdown.push(
        '## Missing tables',
        '',
        ...missingTables.map(
          (table) =>
            `- \`${table}\``,
        ),
        '',
      );
    } else {
      markdown.push(
        '## Table presence',
        '',
        'All manufacturing E2E fixture tables were found.',
        '',
      );
    }

    markdown.push(
      '## Required insert fields',
      '',
      'These are NOT NULL columns with no database default.',
      '',
    );

    for (
      const table of
        requiredTables
    ) {
      const required =
        requiredFixtureFields[
          table
        ] ?? [];

      markdown.push(
        `### ${table}`,
        '',
      );

      if (
        required.length ===
        0
      ) {
        markdown.push(
          '_No mandatory no-default columns detected._',
          '',
        );

        continue;
      }

      markdown.push(
        '| Column | Type |',
        '|---|---|',
        ...required.map(
          (column) =>
            `| \`${column.column_name}\` | \`${column.data_type === 'USER-DEFINED' ? column.udt_name : column.data_type}\` |`,
        ),
        '',
      );
    }

    markdown.push(
      '## Journal-entry indexes',
      '',
    );

    const journalIndexes =
      indexes.filter(
        (index) =>
          index.tablename ===
          'journal_entries',
      );

    if (
      journalIndexes.length ===
      0
    ) {
      markdown.push(
        '_No journal_entries indexes detected._',
        '',
      );
    } else {
      markdown.push(
        ...journalIndexes.map(
          (index) =>
            `- \`${index.indexname}\`: \`${index.indexdef}\``,
        ),
        '',
      );
    }

    writeFileSync(
      resolve(
        artifactsDir,
        'manufacturing-e2e-fixture-contract.md',
      ),
      markdown.join('\n'),
      'utf8',
    );

    console.log(
      `Manufacturing E2E fixture contract: database=${report.current?.database ?? 'unknown'}, missingTables=${missingTables.length}`,
    );

    console.log(
      '- artifacts/manufacturing-e2e-fixture-contract.json',
    );

    console.log(
      '- artifacts/manufacturing-e2e-fixture-contract.md',
    );

    if (
      report.current?.database !==
      requestedDatabase
    ) {
      console.error(
        `Database mismatch: expected "${requestedDatabase}" but connected to "${report.current?.database ?? 'unknown'}".`,
      );
      process.exitCode = 1;
    }

    if (
      missingTables.length
    ) {
      process.exitCode = 1;
    }
  } finally {
    if (
      dataSource.isInitialized
    ) {
      await dataSource.destroy();
    }
  }
}

main().catch(
  (error: unknown) => {
    console.error(
      'Manufacturing E2E fixture contract FAILED.',
    );
    console.error(error);
    process.exitCode = 1;
  },
);