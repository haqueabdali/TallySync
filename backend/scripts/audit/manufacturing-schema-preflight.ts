import 'dotenv/config';

import {
  existsSync,
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

interface ColumnRow {
  table_name: string;
  column_name: string;
}

const requiredColumns: Record<
  string,
  string[]
> = {
  accounting_settings: [
    'raw_materials_inventory_account_id',
    'work_in_progress_account_id',
    'finished_goods_inventory_account_id',
    'manufacturing_variance_account_id',
    'direct_labor_account_id',
    'manufacturing_overhead_account_id',
    'auto_post_material_consumption',
    'auto_post_production_completion',
    'auto_post_production_variance',
  ],
  production_orders: [
    'actual_material_cost',
    'actual_labor_cost',
    'actual_overhead_cost',
    'actual_total_cost',
  ],
  production_variances: [
    'total_variance',
  ],
};

async function main(): Promise<void> {
  const productionOrderPath =
    resolve(
      process.cwd(),
      'src/production-orders/entities/production-order.entity.ts',
    );

  if (existsSync(productionOrderPath)) {
    const content =
      readFileSync(
        productionOrderPath,
        'utf8',
      );

    const duplicateVariance =
      /\btotalVariance\s*!?\s*:/.test(
        content,
      );

    if (duplicateVariance) {
      console.error(
        'BLOCKER: ProductionOrderEntity contains totalVariance. Remove it unless production_orders is intentionally meant to persist a second variance total. The canonical variance total belongs on ProductionVarianceEntity.',
      );

      process.exitCode = 1;
      return;
    }
  }

  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    'tallysync_e2e_test';

  process.env.DATABASE_NAME =
    databaseName;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: dataSource } =
    require(
      '../../src/database/data-source',
    ) as {
      default:
        import('typeorm').DataSource;
    };

  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const rows =
      await dataSource.query<
        ColumnRow[]
      >(`
        SELECT
          table_name,
          column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'accounting_settings',
            'production_orders',
            'production_variances'
          )
      `);

    const existing =
      new Set(
        rows.map(
          (row) =>
            `${row.table_name}.${row.column_name}`,
        ),
      );

    const missing: string[] = [];

    for (
      const [
        table,
        columns,
      ] of Object.entries(
        requiredColumns,
      )
    ) {
      for (const column of columns) {
        const key =
          `${table}.${column}`;

        if (!existing.has(key)) {
          missing.push(key);
        }
      }
    }

    if (missing.length) {
      console.error(
        `Manufacturing schema preflight FAILED: ${missing.length} required column(s) missing.`,
      );

      for (const item of missing) {
        console.error(`- ${item}`);
      }

      console.error(
        '\nRun the E2E migration runner before entity-schema or manufacturing E2E.',
      );

      process.exitCode = 1;
      return;
    }

    console.log(
      'Manufacturing schema preflight passed.',
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch(
  (error: unknown) => {
    console.error(
      error instanceof Error
        ? error.stack ?? error.message
        : 'Manufacturing schema preflight failed.',
    );

    process.exitCode = 1;
  },
);
