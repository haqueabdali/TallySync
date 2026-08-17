import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class StabilizeSalesOrderLineTotals1788010000000
  implements MigrationInterface
{
  name =
    'StabilizeSalesOrderLineTotals1788010000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * Current SalesOrderItemEntity retains both:
     *
     *   line_discount / line_tax
     *   discount_amount / tax_amount
     *
     * Older schema versions require line_discount and line_tax to be
     * NOT NULL. Backfill them from their canonical amount aliases where
     * possible and establish database defaults for defensive safety.
     */

    await queryRunner.query(`
      UPDATE "sales_order_items"
      SET "line_discount" =
        COALESCE(
          "line_discount",
          "discount_amount",
          0
        )
      WHERE "line_discount" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "sales_order_items"
      SET "line_tax" =
        COALESCE(
          "line_tax",
          "tax_amount",
          0
        )
      WHERE "line_tax" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_discount"
      SET DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_tax"
      SET DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "discount_amount"
      SET DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "tax_amount"
      SET DEFAULT 0
    `);

    /*
     * Keep the database contract aligned with the entity contract.
     */
    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_discount"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_tax"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "discount_amount"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "tax_amount"
      SET NOT NULL
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "tax_amount"
      DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "discount_amount"
      DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_tax"
      DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ALTER COLUMN "line_discount"
      DROP DEFAULT
    `);
  }
}
