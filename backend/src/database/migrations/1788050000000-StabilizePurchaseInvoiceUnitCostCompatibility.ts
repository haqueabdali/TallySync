import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class StabilizePurchaseInvoiceUnitCostCompatibility1788050000000
  implements MigrationInterface
{
  name =
    'StabilizePurchaseInvoiceUnitCostCompatibility1788050000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * Legacy schema requires purchase_invoice_items.unit_price NOT NULL.
     * Current entity/service writes unit_cost instead.
     *
     * Keep both columns as compatibility aliases:
     *   unit_price <-> unit_cost
     */

    await queryRunner.query(`
      UPDATE "purchase_invoice_items"
      SET "unit_cost" =
        COALESCE(
          "unit_cost",
          "unit_price"
        )
      WHERE "unit_cost" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "purchase_invoice_items"
      SET "unit_price" =
        COALESCE(
          "unit_price",
          "unit_cost"
        )
      WHERE "unit_price" IS NULL
    `);

    /*
     * Make legacy unit_price non-blocking for current writers.
     * Existing data remains intact.
     */
    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_price"
      DROP NOT NULL
    `);

    /*
     * Defensive defaults for direct/older writers.
     */
    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_cost"
      SET DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_price"
      SET DEFAULT 0
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      UPDATE "purchase_invoice_items"
      SET "unit_price" =
        COALESCE(
          "unit_price",
          "unit_cost",
          0
        )
      WHERE "unit_price" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_price"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_price"
      DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_cost"
      DROP DEFAULT
    `);
  }
}
