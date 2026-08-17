import 'dotenv/config';
import { Client } from 'pg';

interface MigrationRename {
  oldTimestamp: number;
  newTimestamp: number;
  oldName: string;
  newName: string;
}

const migrations: MigrationRename[] = [
  { oldTimestamp: 1762362000000, newTimestamp: 1787600000000, oldName: 'CreateBillOfMaterials1762362000000', newName: 'CreateBillOfMaterials1787600000000' },
  { oldTimestamp: 1762448400000, newTimestamp: 1787601000000, oldName: 'CreateProductionOrders1762448400000', newName: 'CreateProductionOrders1787601000000' },
  { oldTimestamp: 1762534800000, newTimestamp: 1787602000000, oldName: 'CreateMaterialConsumptions1762534800000', newName: 'CreateMaterialConsumptions1787602000000' },
  { oldTimestamp: 1762621200000, newTimestamp: 1787603000000, oldName: 'CreateFinishedGoodsReceipts1762621200000', newName: 'CreateFinishedGoodsReceipts1787603000000' },
  { oldTimestamp: 1762707600000, newTimestamp: 1787604000000, oldName: 'CreateAssetManagement1762707600000', newName: 'CreateAssetManagement1787604000000' },
  { oldTimestamp: 1762794000000, newTimestamp: 1787605000000, oldName: 'CreateDepreciation1762794000000', newName: 'CreateDepreciation1787605000000' },
  { oldTimestamp: 1762880400000, newTimestamp: 1787606000000, oldName: 'CreateBankReconciliation1762880400000', newName: 'CreateBankReconciliation1787606000000' },
  { oldTimestamp: 1762966800000, newTimestamp: 1787607000000, oldName: 'CreateVatEngine1762966800000', newName: 'CreateVatEngine1787607000000' },
  { oldTimestamp: 1763053200000, newTimestamp: 1787608000000, oldName: 'CreateCashFlow1763053200000', newName: 'CreateCashFlow1787608000000' },
  { oldTimestamp: 1763140000000, newTimestamp: 1787609000000, oldName: 'CreateInventoryRevaluation1763140000000', newName: 'CreateInventoryRevaluation1787609000000' },
  { oldTimestamp: 1763226000000, newTimestamp: 1787610000000, oldName: 'CreateManualCostAdjustments1763226000000', newName: 'CreateManualCostAdjustments1787610000000' },
  { oldTimestamp: 1763312400000, newTimestamp: 1787611000000, oldName: 'CreateNegativeInventoryPolicies1763312400000', newName: 'CreateNegativeInventoryPolicies1787611000000' },
  { oldTimestamp: 1763398800000, newTimestamp: 1787612000000, oldName: 'CreateManufacturingWipAccounting1763398800000', newName: 'CreateManufacturingWipAccounting1787612000000' },
  { oldTimestamp: 1763485200000, newTimestamp: 1787613000000, oldName: 'CreateProductionVariance1763485200000', newName: 'CreateProductionVariance1787613000000' },
  { oldTimestamp: 1763571600000, newTimestamp: 1787614000000, oldName: 'CreateAssetDisposal1763571600000', newName: 'CreateAssetDisposal1787614000000' },
  { oldTimestamp: 1763658000000, newTimestamp: 1787615000000, oldName: 'CreateVatSettlement1763658000000', newName: 'CreateVatSettlement1787615000000' },
  { oldTimestamp: 1763744400000, newTimestamp: 1787616000000, oldName: 'CreateBackgroundJobs1763744400000', newName: 'CreateBackgroundJobs1787616000000' },
  { oldTimestamp: 1763830800000, newTimestamp: 1787617000000, oldName: 'CreateNotifications1763830800000', newName: 'CreateNotifications1787617000000' },
  { oldTimestamp: 1765108800000, newTimestamp: 1787618000000, oldName: 'CreateProductionSchedules1765108800000', newName: 'CreateProductionSchedules1787618000000' },
  { oldTimestamp: 1765112400000, newTimestamp: 1787619000000, oldName: 'CreateCapacityPlanning1765112400000', newName: 'CreateCapacityPlanning1787619000000' },
  { oldTimestamp: 1765116000000, newTimestamp: 1787620000000, oldName: 'CreateQualityManagement1765116000000', newName: 'CreateQualityManagement1787620000000' },
  { oldTimestamp: 1765119600000, newTimestamp: 1787621000000, oldName: 'CreateMaintenanceManagement1765119600000', newName: 'CreateMaintenanceManagement1787621000000' },
  { oldTimestamp: 1765123200000, newTimestamp: 1787622000000, oldName: 'CreateCostingVariance1765123200000', newName: 'CreateCostingVariance1787622000000' },
];

async function tableExists(
  client: Client,
  tableName: string,
): Promise<boolean> {
  const result = await client.query<{
    exists: boolean;
  }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS "exists"
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME ?? 'tallysync_db',
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  });

  await client.connect();

  try {
    const exists = await tableExists(
      client,
      'typeorm_migrations',
    );

    if (!exists) {
      console.log(
        'Migration history table does not exist yet; nothing to repair.',
      );
      return;
    }

    await client.query('BEGIN');

    for (const migration of migrations) {
      const oldRow = await client.query(
        `
          SELECT id, timestamp, name
          FROM typeorm_migrations
          WHERE name = $1
          LIMIT 1
        `,
        [migration.oldName],
      );

      if (oldRow.rowCount === 0) {
        continue;
      }

      const newRow = await client.query(
        `
          SELECT id
          FROM typeorm_migrations
          WHERE name = $1
          LIMIT 1
        `,
        [migration.newName],
      );

      if ((newRow.rowCount ?? 0) > 0) {
        console.log(
          `History already contains ${migration.newName}; leaving old row unchanged.`,
        );
        continue;
      }

      await client.query(
        `
          UPDATE typeorm_migrations
          SET timestamp = $1,
              name = $2
          WHERE name = $3
        `,
        [
          migration.newTimestamp,
          migration.newName,
          migration.oldName,
        ],
      );

      console.log(
        `Renamed migration history: ${migration.oldName} -> ${migration.newName}`,
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Migration history repair failed.',
  );
  process.exitCode = 1;
});
