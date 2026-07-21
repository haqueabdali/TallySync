import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTallyVoucherTrackingToSalesOrders1750000000000
  implements MigrationInterface
{
  name = 'AddTallyVoucherTrackingToSalesOrders1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN "tally_voucher_id" bigint
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN "tally_voucher_number" varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN "tally_sync_error" text
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN "tally_sync_attempts" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN "tally_sync_attempts"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN "tally_sync_error"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN "tally_voucher_number"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN "tally_voucher_id"
    `);
  }
}