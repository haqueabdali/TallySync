import {
  NestFactory,
} from '@nestjs/core';
import type {
  INestApplicationContext,
} from '@nestjs/common';
import {
  DataSource,
} from 'typeorm';

import {
  AppModule,
} from '../../src/app.module';
import {
  AccountingEngineService,
} from '../../src/accounting-engine/accounting-engine.service';

type IdRow = {
  id: string;
};

type JournalSummaryRow = {
  source_type: string;
  source_id: string;
  journal_count: string;
  debit: string;
  credit: string;
};

type MovementRow = {
  debit: string;
  credit: string;
};

const money = (
  value: unknown,
): number =>
  Math.round(
    Number(
      value ?? 0,
    ) * 100,
  ) / 100;

async function insertId(
  dataSource: DataSource,
  sql: string,
  parameters: unknown[],
): Promise<string> {
  const rows =
    await dataSource.query<
      IdRow[]
    >(
      sql,
      parameters,
    );

  const id =
    rows[0]?.id;

  if (!id) {
    throw new Error(
      'Insert did not return an id.',
    );
  }

  return id;
}

export async function runManufacturingAccountingEngineSmoke(): Promise<void> {
  const requestedDatabase =
    process.env.E2E_DATABASE_NAME ??
    process.env.DATABASE_NAME ??
    'tallysync_e2e_test';

  process.env.DATABASE_NAME =
    requestedDatabase;

  let app:
    INestApplicationContext |
    undefined;

  let dataSource:
    DataSource |
    undefined;

  let companyId:
    string |
    undefined;

  try {
    app =
      await NestFactory
        .createApplicationContext(
          AppModule,
          {
            /*
             * Critical for Jest:
             * do not let Nest terminate the whole Jest process when bootstrap
             * fails. Throw the underlying error so the E2E output shows the
             * actual missing provider/configuration problem.
             */
            abortOnError: false,
            logger: [
              'error',
            ],
          },
        );
    const db =
      app.get(
        DataSource,
      );

    /*
     * Definite DataSource for the executable body.
     * The outer variable is retained only for guarded cleanup.
     */
    dataSource =
      db;

const currentDb =
  await db.query<
        Array<{
          database: string;
        }>
      >(
        `SELECT current_database() AS database`,
      );

    const connectedDatabase =
      currentDb[0]
        ?.database;

    if (
      connectedDatabase !==
      requestedDatabase
    ) {
      throw new Error(
        `Database mismatch: expected "${requestedDatabase}", connected to "${connectedDatabase ?? 'unknown'}".`,
      );
    }

    const accountingEngine =
      app.get(
        AccountingEngineService,
      );

    const engine =
      accountingEngine as AccountingEngineService & {
        postMaterialConsumption?: (
          sourceId: string,
          companyId: string,
          userId: string,
        ) => Promise<unknown>;

        postProductionCompletion?: (
          sourceId: string,
          companyId: string,
          userId: string,
        ) => Promise<unknown>;

        postProductionVariance?: (
          sourceId: string,
          companyId: string,
          userId: string,
        ) => Promise<unknown>;
      };

    if (
      typeof engine
        .postMaterialConsumption !==
      'function'
    ) {
      throw new Error(
        'AccountingEngineService.postMaterialConsumption() is missing from the live app.',
      );
    }

    if (
      typeof engine
        .postProductionCompletion !==
      'function'
    ) {
      throw new Error(
        'AccountingEngineService.postProductionCompletion() is missing from the live app.',
      );
    }

    if (
      typeof engine
        .postProductionVariance !==
      'function'
    ) {
      throw new Error(
        'AccountingEngineService.postProductionVariance() is missing from the live app.',
      );
    }

    const token =
      `${Date.now()}-${Math.floor(
        Math.random() *
          100000,
      )}`;

    /*
     * JournalEntriesService stores actor ids as nullable UUID audit columns.
     * The journal migration does not define an FK from created_by/posted_by
     * to users, so a stable UUID is sufficient for this isolated engine test.
     */
    const actorId =
      '00000000-0000-4000-8000-000000000001';

    companyId =
      await insertId(
        db,
        `
        INSERT INTO companies (
          name,
          tally_company_name
        )
        VALUES ($1, $2)
        RETURNING id
        `,
        [
          `MFG E2E ${token}`,
          `MFG-E2E-${token}`,
        ],
      );

    const accountTypes =
      await db.query<
        Array<{
          value: string;
        }>
      >(
        `
        SELECT
          e.enumlabel AS value
        FROM pg_enum e
        JOIN pg_type t
          ON t.oid = e.enumtypid
        WHERE t.typname =
          'accounts_type_enum'
        ORDER BY e.enumsortorder
        `,
      );

    const accountBalances =
      await db.query<
        Array<{
          value: string;
        }>
      >(
        `
        SELECT
          e.enumlabel AS value
        FROM pg_enum e
        JOIN pg_type t
          ON t.oid = e.enumtypid
        WHERE t.typname =
          'accounts_normal_balance_enum'
        ORDER BY e.enumsortorder
        `,
      );

    const typeValues =
      accountTypes.map(
        (row) =>
          row.value,
      );

    const balanceValues =
      accountBalances.map(
        (row) =>
          row.value,
      );

    const assetType =
      typeValues.find(
        (value) =>
          value.toLowerCase() ===
          'asset',
      ) ??
      typeValues[0];

    const expenseType =
      typeValues.find(
        (value) =>
          value.toLowerCase() ===
          'expense',
      ) ??
      assetType;

    const debitBalance =
      balanceValues.find(
        (value) =>
          value.toLowerCase() ===
          'debit',
      ) ??
      balanceValues[0];

    if (
      !assetType ||
      !expenseType ||
      !debitBalance
    ) {
      throw new Error(
        'Could not resolve account enum values.',
      );
    }

    const createAccount =
      async (
        code: string,
        name: string,
        type: string,
      ): Promise<string> =>
        insertId(
          db,
          `
          INSERT INTO accounts (
            company_id,
            code,
            name,
            type,
            normal_balance
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          RETURNING id
          `,
          [
            companyId,
            code,
            name,
            type,
            debitBalance,
          ],
        );

    const rawMaterialsAccountId =
      await createAccount(
        `RM-${token}`,
        'Raw Materials Inventory',
        assetType,
      );

    const wipAccountId =
      await createAccount(
        `WIP-${token}`,
        'Work In Progress',
        assetType,
      );

    const finishedGoodsAccountId =
      await createAccount(
        `FG-${token}`,
        'Finished Goods Inventory',
        assetType,
      );

    const varianceAccountId =
      await createAccount(
        `VAR-${token}`,
        'Manufacturing Variance',
        expenseType,
      );

    await db.query(
      `
      INSERT INTO accounting_settings (
        company_id,
        raw_materials_inventory_account_id,
        work_in_progress_account_id,
        finished_goods_inventory_account_id,
        manufacturing_variance_account_id,
        auto_post_material_consumption,
        auto_post_production_completion,
        auto_post_production_variance
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        true,
        true,
        true
      )
      `,
      [
        companyId,
        rawMaterialsAccountId,
        wipAccountId,
        finishedGoodsAccountId,
        varianceAccountId,
      ],
    );

    const warehouseId =
      await insertId(
        db,
        `
        INSERT INTO warehouses (
          company_id,
          warehouse_code,
          name
        )
        VALUES (
          $1,
          $2,
          $3
        )
        RETURNING id
        `,
        [
          companyId,
          `WH-${token}`,
          'Manufacturing E2E Warehouse',
        ],
      );

    const rawItemId =
      await insertId(
        db,
        `
        INSERT INTO items (
          company_id,
          name
        )
        VALUES ($1, $2)
        RETURNING id
        `,
        [
          companyId,
          `Raw Material ${token}`,
        ],
      );

    const finishedItemId =
      await insertId(
        db,
        `
        INSERT INTO items (
          company_id,
          name
        )
        VALUES ($1, $2)
        RETURNING id
        `,
        [
          companyId,
          `Finished Good ${token}`,
        ],
      );

    const bomId =
      await insertId(
        db,
        `
        INSERT INTO bills_of_material (
          company_id,
          finished_item_id,
          code,
          name,
          output_quantity
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          1
        )
        RETURNING id
        `,
        [
          companyId,
          finishedItemId,
          `BOM-${token}`,
          `Manufacturing E2E BOM ${token}`,
        ],
      );

    await db.query(
      `
      INSERT INTO bill_of_material_components (
        bill_of_material_id,
        component_item_id,
        quantity
      )
      VALUES (
        $1,
        $2,
        1
      )
      `,
      [
        bomId,
        rawItemId,
      ],
    );

    /*
     * Keep one production source for both consumption and completion.
     *
     * Material cost = 120
     * Completion cost = 100
     * Variance        = 20
     *
     * Expected WIP:
     *   +120 consumption
     *   -100 completion
     *   -20  variance
     *   = 0
     */
    const productionOrderId =
      await insertId(
        db,
        `
        INSERT INTO production_orders (
          company_id,
          order_number,
          bill_of_material_id,
          finished_item_id,
          warehouse_id,
          planned_quantity,
          completed_quantity,
          actual_material_cost,
          actual_labor_cost,
          actual_overhead_cost,
          actual_total_cost
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          1,
          1,
          100,
          0,
          0,
          100
        )
        RETURNING id
        `,
        [
          companyId,
          `PO-${token}`,
          bomId,
          finishedItemId,
          warehouseId,
        ],
      );

    const productionOrderComponentId =
      await insertId(
        db,
        `
        INSERT INTO production_order_components (
          production_order_id,
          component_item_id,
          bom_quantity,
          required_quantity,
          consumed_quantity
        )
        VALUES (
          $1,
          $2,
          1,
          1,
          1
        )
        RETURNING id
        `,
        [
          productionOrderId,
          rawItemId,
        ],
      );

    const materialConsumptionId =
      await insertId(
        db,
        `
        INSERT INTO material_consumptions (
          company_id,
          consumption_number,
          production_order_id,
          warehouse_id,
          consumption_date
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          CURRENT_DATE
        )
        RETURNING id
        `,
        [
          companyId,
          `MC-${token}`,
          productionOrderId,
          warehouseId,
        ],
      );

    await db.query(
      `
      INSERT INTO material_consumption_lines (
        consumption_id,
        production_order_component_id,
        item_id,
        quantity,
        unit_cost,
        total_cost
      )
      VALUES (
        $1,
        $2,
        $3,
        1,
        120,
        120
      )
      `,
      [
        materialConsumptionId,
        productionOrderComponentId,
        rawItemId,
      ],
    );

    const productionVarianceId =
      await insertId(
        db,
        `
        INSERT INTO production_variances (
          company_id,
          production_order_id,
          variance_date,
          material_cost,
          finished_goods_cost,
          wip_variance,
          total_variance
        )
        VALUES (
          $1,
          $2,
          CURRENT_DATE,
          120,
          100,
          20,
          20
        )
        RETURNING id
        `,
        [
          companyId,
          productionOrderId,
        ],
      );

    /*
     * Execute the real accounting engine.
     */
    await engine.postMaterialConsumption(
      materialConsumptionId,
      companyId,
      actorId,
    );

    await engine.postProductionCompletion(
      productionOrderId,
      companyId,
      actorId,
    );

    await engine.postProductionVariance(
      productionVarianceId,
      companyId,
      actorId,
    );

    /*
     * Retry all three. Every retry must reuse the live source journal.
     */
    await engine.postMaterialConsumption(
      materialConsumptionId,
      companyId,
      actorId,
    );

    await engine.postProductionCompletion(
      productionOrderId,
      companyId,
      actorId,
    );

    await engine.postProductionVariance(
      productionVarianceId,
      companyId,
      actorId,
    );

    const summaries =
      await db.query<
        JournalSummaryRow[]
      >(
        `
        SELECT
          je.source_type,
          je.source_id,
          COUNT(DISTINCT je.id)::text
            AS journal_count,
          COALESCE(
            SUM(jel.debit),
            0
          )::text AS debit,
          COALESCE(
            SUM(jel.credit),
            0
          )::text AS credit
        FROM journal_entries je
        JOIN journal_entry_lines jel
          ON jel.journal_entry_id =
             je.id
        WHERE je.company_id = $1
          AND je.deleted_at IS NULL
          AND je.source_id = ANY(
            $2::uuid[]
          )
        GROUP BY
          je.source_type,
          je.source_id
        ORDER BY
          je.source_type
        `,
        [
          companyId,
          [
            materialConsumptionId,
            productionOrderId,
            productionVarianceId,
          ],
        ],
      );

    if (
      summaries.length !==
      3
    ) {
      throw new Error(
        `Expected 3 manufacturing source journals, found ${summaries.length}.`,
      );
    }

    for (
      const summary of
        summaries
    ) {
      if (
        Number(
          summary.journal_count,
        ) !== 1
      ) {
        throw new Error(
          `Source ${summary.source_type}/${summary.source_id} has ${summary.journal_count} live journals.`,
        );
      }

      if (
        money(
          summary.debit,
        ) !==
        money(
          summary.credit,
        )
      ) {
        throw new Error(
          `Journal ${summary.source_type}/${summary.source_id} is not balanced: DR=${summary.debit}, CR=${summary.credit}.`,
        );
      }
    }

    const wipRows =
      await db.query<
        MovementRow[]
      >(
        `
        SELECT
          COALESCE(
            SUM(jel.debit),
            0
          )::text AS debit,
          COALESCE(
            SUM(jel.credit),
            0
          )::text AS credit
        FROM journal_entry_lines jel
        JOIN journal_entries je
          ON je.id =
             jel.journal_entry_id
        WHERE je.company_id = $1
          AND je.deleted_at IS NULL
          AND jel.account_id = $2
          AND je.source_id = ANY(
            $3::uuid[]
          )
        `,
        [
          companyId,
          wipAccountId,
          [
            materialConsumptionId,
            productionOrderId,
            productionVarianceId,
          ],
        ],
      );

    const wipDebit =
      money(
        wipRows[0]
          ?.debit,
      );

    const wipCredit =
      money(
        wipRows[0]
          ?.credit,
      );

    const wipNet =
      money(
        wipDebit -
          wipCredit,
      );

    if (
      Math.abs(
        wipNet,
      ) >
      0.009
    ) {
      throw new Error(
        `Manufacturing WIP did not reconcile to zero. DR=${wipDebit}, CR=${wipCredit}, NET=${wipNet}.`,
      );
    }

    console.log(
      'Manufacturing accounting engine smoke PASSED.',
    );

    console.log(
      `Database: ${connectedDatabase}`,
    );

    console.log(
      `Company: ${companyId}`,
    );

    console.log(
      'Source journals: 3',
    );

    console.log(
      'Retry uniqueness: PASS',
    );

    console.log(
      `WIP reconciliation: DR=${wipDebit.toFixed(2)} CR=${wipCredit.toFixed(2)} NET=${wipNet.toFixed(2)}`,
    );
  } finally {
    /*
     * Remove only this script's isolated tenant.
     * Explicit child cleanup avoids relying on cascade behavior.
     */
    if (
      dataSource &&
      companyId
    ) {
      try {
        await dataSource.query(
          `
          DELETE FROM journal_entry_lines
          WHERE journal_entry_id IN (
            SELECT id
            FROM journal_entries
            WHERE company_id = $1
          )
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM journal_entries
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM production_variance_lines
          WHERE production_variance_id IN (
            SELECT id
            FROM production_variances
            WHERE company_id = $1
          )
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM production_variances
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM manufacturing_wip_postings
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM material_consumption_lines
          WHERE consumption_id IN (
            SELECT id
            FROM material_consumptions
            WHERE company_id = $1
          )
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM material_consumptions
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM production_order_components
          WHERE production_order_id IN (
            SELECT id
            FROM production_orders
            WHERE company_id = $1
          )
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM production_orders
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM bill_of_material_components
          WHERE bill_of_material_id IN (
            SELECT id
            FROM bills_of_material
            WHERE company_id = $1
          )
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM bills_of_material
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM manufacturing_wip_accounting_settings
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM accounting_settings
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM items
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM warehouses
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM accounts
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM categories
          WHERE company_id = $1
          `,
          [
            companyId,
          ],
        );

        await dataSource.query(
          `
          DELETE FROM companies
          WHERE id = $1
          `,
          [
            companyId,
          ],
        );
      } catch (
        cleanupError:
          unknown
      ) {
        console.error(
          'Manufacturing E2E cleanup failed.',
        );

        console.error(
          cleanupError,
        );
      }
    }

    if (app) {
      await app.close();
    }
  }
}

if (require.main === module) {
  runManufacturingAccountingEngineSmoke().catch(
    (
      error:
        unknown,
    ) => {
      console.error(
        'Manufacturing accounting engine smoke FAILED.',
      );

      console.error(
        error,
      );

      process.exitCode =
        1;
    },
  );
}