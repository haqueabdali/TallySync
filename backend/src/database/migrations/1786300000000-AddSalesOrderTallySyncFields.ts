import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesOrderTallySyncFields1786300000000
  implements MigrationInterface
{
  name = 'AddSalesOrderTallySyncFields1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'sales_orders_sync_status_enum'
        ) THEN
          CREATE TYPE "public"."sales_orders_sync_status_enum"
          AS ENUM ('pending', 'syncing', 'synced', 'failed');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "sync_status"
      "public"."sales_orders_sync_status_enum"
      NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "tally_voucher_id"
      character varying(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "tally_voucher_number"
      character varying(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "tally_sync_error" text
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "tally_sync_attempts"
      integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "last_synced_at"
      TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
  ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "approved_at"
  TIMESTAMP WITH TIME ZONE
`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_orders_sync_status"
      ON "sales_orders" ("company_id", "sync_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sales_orders_sync_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "last_synced_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "tally_sync_attempts"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "tally_sync_error"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "tally_voucher_number"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "tally_voucher_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "sync_status"
    `);

    await queryRunner.query(`
  ALTER TABLE "sales_orders"
  DROP COLUMN IF EXISTS "approved_at"
`);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."sales_orders_sync_status_enum"
    `);
  }
}
