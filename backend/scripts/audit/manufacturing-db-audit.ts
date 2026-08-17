import 'dotenv/config';
import {
  DataSource,
} from 'typeorm';

const TABLE_PATTERNS = [
  '%bill%material%',
  '%production%order%',
  '%material%consumption%',
  '%production%variance%',
  '%work%center%',
];

interface TableRow {
  table_name: string;
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  is_nullable: string;
  data_type: string;
}

async function main(): Promise<void> {
  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_db';

  process.env.DATABASE_NAME =
    databaseName;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } =
    require(
      '../../src/database/data-source',
    ) as {
      default: DataSource;
    };

  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const conditions =
      TABLE_PATTERNS.map(
        (_, index) =>
          `table_name ILIKE $${index + 1}`,
      ).join(' OR ');

    const tables =
      await dataSource.query<
        TableRow[]
      >(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND (${conditions})
          ORDER BY table_name
        `,
        TABLE_PATTERNS,
      );

    console.log(
      `Manufacturing DB audit against "${databaseName}"`,
    );
    console.log(
      '========================================\n',
    );

    if (!tables.length) {
      console.error(
        'No manufacturing tables matched the expected patterns.',
      );
      process.exitCode = 1;
      return;
    }

    const names =
      tables.map(
        (table) =>
          table.table_name,
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
            data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ANY($1)
          ORDER BY table_name, ordinal_position
        `,
        [names],
      );

    let current:
      | string
      | null = null;

    for (const column of columns) {
      if (
        current !==
        column.table_name
      ) {
        current =
          column.table_name;

        console.log(
          `\n[${current}]`,
        );
      }

      console.log(
        `  ${column.column_name.padEnd(34)} ${column.data_type.padEnd(22)} nullable=${column.is_nullable}`,
      );
    }

    const itemResult =
      await dataSource.query<
        ColumnRow[]
      >(
        `
          SELECT
            table_name,
            column_name,
            is_nullable,
            data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'items'
            AND column_name IN (
              'current_stock',
              'stock_qty',
              'current_qty',
              'quantity_on_hand'
            )
        `,
      );

    const canonical =
      itemResult.find(
        (column) =>
          column.column_name ===
          'current_stock',
      );

    const legacy =
      itemResult.filter(
        (column) =>
          column.column_name !==
          'current_stock',
      );

    if (!canonical) {
      console.error(
        '\nBLOCKER: items.current_stock was not found.',
      );
      process.exitCode = 1;
    } else {
      console.log(
        '\nInventory contract: items.current_stock is present.',
      );
    }

    if (legacy.length) {
      console.log(
        `WARNING: legacy parallel stock column(s) exist: ${legacy
          .map(
            (column) =>
              column.column_name,
          )
          .join(', ')}`,
      );
    }
  } finally {
    if (
      dataSource.isInitialized
    ) {
      await dataSource.destroy();
    }
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Manufacturing DB audit failed.',
    );
    process.exitCode = 1;
  },
);
