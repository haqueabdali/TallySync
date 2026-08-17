import 'dotenv/config';
import { DataSource, EntityMetadata } from 'typeorm';

interface DbColumn {
  table_name: string;
  column_name: string;
  is_nullable: 'YES' | 'NO';
  data_type: string;
  udt_name: string;
}

interface Finding {
  severity: 'ERROR' | 'WARN';
  table: string;
  detail: string;
}

function tableName(metadata: EntityMetadata): string {
  return metadata.tableName;
}

async function main(): Promise<void> {
  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_db';

  if (
    process.env.NODE_ENV === 'production' &&
    !/test|dev|local/i.test(databaseName)
  ) {
    throw new Error(
      `Refusing schema audit against production-like database "${databaseName}".`,
    );
  }

  process.env.DATABASE_NAME = databaseName;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } =
    require('../src/database/data-source') as {
      default: DataSource;
    };

  const findings: Finding[] = [];

  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const rows =
      await dataSource.query<DbColumn[]>(`
        SELECT
          table_name,
          column_name,
          is_nullable,
          data_type,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `);

    const dbColumns =
      new Map<string, Map<string, DbColumn>>();

    for (const row of rows) {
      if (!dbColumns.has(row.table_name)) {
        dbColumns.set(row.table_name, new Map());
      }
      dbColumns
        .get(row.table_name)!
        .set(row.column_name, row);
    }

    const entitiesByTable =
      new Map<string, EntityMetadata[]>();

    for (const metadata of dataSource.entityMetadatas) {
      const table = tableName(metadata);
      if (!entitiesByTable.has(table)) {
        entitiesByTable.set(table, []);
      }
      entitiesByTable.get(table)!.push(metadata);
    }

    for (const [table, metas] of entitiesByTable) {
      if (metas.length > 1) {
        findings.push({
          severity: 'WARN',
          table,
          detail:
            `Multiple entities map to this table: ${metas
              .map((m) => m.name)
              .join(', ')}`,
        });
      }
    }

    for (const metadata of dataSource.entityMetadatas) {
      const table = tableName(metadata);
      const columns = dbColumns.get(table);

      if (!columns) {
        findings.push({
          severity: 'ERROR',
          table,
          detail: 'Entity table does not exist in PostgreSQL.',
        });
        continue;
      }

      for (const column of metadata.columns) {
        const databaseColumnName = column.databaseName;
        if (!databaseColumnName) continue;

        const dbColumn =
          columns.get(databaseColumnName);

        if (!dbColumn) {
          findings.push({
            severity: 'ERROR',
            table,
            detail:
              `Missing column "${databaseColumnName}" required by ${metadata.name}.${column.propertyName}.`,
          });
          continue;
        }

        if (
          column.isNullable &&
          dbColumn.is_nullable === 'NO'
        ) {
          findings.push({
            severity: 'ERROR',
            table,
            detail:
              `Nullability mismatch: ${metadata.name}.${column.propertyName} is nullable but "${databaseColumnName}" is NOT NULL.`,
          });
        }

        if (
          !column.isNullable &&
          !column.isGenerated &&
          dbColumn.is_nullable === 'YES'
        ) {
          findings.push({
            severity: 'WARN',
            table,
            detail:
              `"${databaseColumnName}" is nullable in DB while ${metadata.name}.${column.propertyName} is required.`,
          });
        }
      }
    }

    const errors = findings.filter(
      (f) => f.severity === 'ERROR',
    );
    const warnings = findings.filter(
      (f) => f.severity === 'WARN',
    );

    console.log(
      `Entity schema audit checked ${dataSource.entityMetadatas.length} entity metadata definitions.`,
    );

    if (warnings.length) {
      console.log(`\nWarnings (${warnings.length}):`);
      for (const w of warnings) {
        console.log(`- [${w.table}] ${w.detail}`);
      }
    }

    if (errors.length) {
      console.error(
        `\nEntity schema audit FAILED with ${errors.length} error(s):`,
      );
      for (const e of errors) {
        console.error(`- [${e.table}] ${e.detail}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      '\nEntity schema audit passed: no blocking entity/database column mismatches found.',
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Entity schema audit failed unexpectedly.',
  );
  process.exitCode = 1;
});
