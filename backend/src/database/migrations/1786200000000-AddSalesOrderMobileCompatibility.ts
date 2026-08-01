import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesOrderMobileCompatibility1786200000000
  implements MigrationInterface
{
  name = 'AddSalesOrderMobileCompatibility1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "approval_required" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
  ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "approved_at"
  TIMESTAMP WITH TIME ZONE
`);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "item_name" character varying(200)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "sku" character varying(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "unit" character varying(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "line_discount" numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "line_tax" numeric(18,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP COLUMN IF EXISTS "line_tax"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP COLUMN IF EXISTS "line_discount"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP COLUMN IF EXISTS "unit"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP COLUMN IF EXISTS "sku"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP COLUMN IF EXISTS "item_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "approval_required"
    `);

    await queryRunner.query(`
  ALTER TABLE "sales_orders"
  DROP COLUMN IF EXISTS "approved_at"
`);
  }
}
