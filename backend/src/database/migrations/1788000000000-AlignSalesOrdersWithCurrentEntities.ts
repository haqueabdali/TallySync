import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AlignSalesOrdersWithCurrentEntities1788000000000
  implements MigrationInterface
{
  name =
    'AlignSalesOrdersWithCurrentEntities1788000000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * The original 178410 CreateSalesOrders migration created:
     *
     *   sales_order_items.item_name NOT NULL
     *   sales_order_items.unit      NOT NULL
     *
     * The current SalesOrdersService does not persist either field when a
     * line is created. The current entity explicitly allows both to be null.
     *
     * Remove only those obsolete constraints.
     */
    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "item_name"
      DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "unit"
      DROP NOT NULL
    `);

    /*
     * The first sales_orders table uses sales_order_status_enum, while a
     * later migration created sales_orders_status_enum without converting
     * the existing column. Add the states required by the current entity to
     * the enum that the live column actually uses.
     */
    await queryRunner.query(`
      ALTER TYPE "public"."sales_order_status_enum"
      ADD VALUE IF NOT EXISTS 'confirmed'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."sales_order_status_enum"
      ADD VALUE IF NOT EXISTS 'partially_delivered'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."sales_order_status_enum"
      ADD VALUE IF NOT EXISTS 'delivered'
    `);

    /*
     * Same issue for sync status: the original live column uses
     * sales_order_sync_status_enum, which did not include `syncing`.
     */
    await queryRunner.query(`
      ALTER TYPE "public"."sales_order_sync_status_enum"
      ADD VALUE IF NOT EXISTS 'syncing'
    `);

    /*
     * Keep the existing table while aligning column definitions with the
     * current entity metadata.
     */
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ALTER COLUMN "order_number"
      TYPE varchar(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ALTER COLUMN "subtotal"
      TYPE numeric(18,2)
      USING "subtotal"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ALTER COLUMN "discount_total"
      TYPE numeric(18,2)
      USING "discount_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ALTER COLUMN "tax_total"
      TYPE numeric(18,2)
      USING "tax_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ALTER COLUMN "grand_total"
      TYPE numeric(18,2)
      USING "grand_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "description"
      TYPE varchar(250)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "quantity"
      TYPE numeric(18,4)
      USING "quantity"::numeric(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "unit_price"
      TYPE numeric(18,4)
      USING "unit_price"::numeric(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "discount_percent"
      TYPE numeric(7,4)
      USING "discount_percent"::numeric(7,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "tax_percent"
      TYPE numeric(7,4)
      USING "tax_percent"::numeric(7,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_subtotal"
      TYPE numeric(18,2)
      USING "line_subtotal"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_discount"
      TYPE numeric(18,2)
      USING "line_discount"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_tax"
      TYPE numeric(18,2)
      USING "line_tax"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_total"
      TYPE numeric(18,2)
      USING "line_total"::numeric(18,2)
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * PostgreSQL enum values cannot be safely removed in-place without
     * rebuilding the enum type, so down() intentionally does not attempt to
     * remove the added values.
     *
     * Restore only the legacy NOT NULL constraints when every existing row
     * can satisfy them.
     */
    await queryRunner.query(`
      UPDATE "sales_order_items"
      SET "item_name" = ''
      WHERE "item_name" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "sales_order_items"
      SET "unit" = ''
      WHERE "unit" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "item_name"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "unit"
      SET NOT NULL
    `);
  }
}
