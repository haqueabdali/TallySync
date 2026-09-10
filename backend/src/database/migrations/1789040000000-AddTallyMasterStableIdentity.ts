import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTallyMasterStableIdentity1789040000000 implements MigrationInterface {
  name = 'AddTallyMasterStableIdentity1789040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "tally_ledger_id"
      varchar(150)
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "tally_alter_id"
      bigint
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "tally_alter_id"
      bigint
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_customers_company_tally_ledger_id"
      ON "customers" (
        "company_id",
        "tally_ledger_id"
      )
      WHERE
        "tally_ledger_id" IS NOT NULL
        AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_items_company_tally_stock_item_id"
      ON "items" (
        "company_id",
        "tally_stock_item_id"
      )
      WHERE
        "tally_stock_item_id" IS NOT NULL
        AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_customers_company_tally_alter_id"
      ON "customers" (
        "company_id",
        "tally_alter_id"
      )
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_items_company_tally_alter_id"
      ON "items" (
        "company_id",
        "tally_alter_id"
      )
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_items_company_tally_alter_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_customers_company_tally_alter_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_items_company_tally_stock_item_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_customers_company_tally_ledger_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "tally_alter_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "tally_alter_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "tally_ledger_id"
    `);
  }
}
