import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AlignItemsTableWithCanonicalEntity1787900000000
  implements MigrationInterface
{
  name =
    'AlignItemsTableWithCanonicalEntity1787900000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * The original core migration created a smaller items table using
     * tax_percent and opening_stock. The canonical Items module now expects
     * the fields below. Keep legacy columns in place for backwards
     * compatibility, but add/copy the canonical columns.
     */

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "barcode"
      varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "tax_rate"
      numeric(8,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "items"
      SET "tax_rate" = COALESCE("tax_percent", 0)
      WHERE "tax_rate" = 0
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "current_stock"
      numeric(18,3) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "items"
      SET "current_stock" =
        COALESCE("opening_stock", 0)
      WHERE "current_stock" = 0
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "minimum_stock"
      numeric(18,3) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "track_inventory"
      boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "hsn_code"
      varchar(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "tally_stock_item_id"
      varchar(150)
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "tally_item_name"
      varchar(200)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname =
            'items_sync_status_enum'
        ) THEN
          CREATE TYPE
            "items_sync_status_enum"
          AS ENUM (
            'pending',
            'synced',
            'failed'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "sync_status"
      "items_sync_status_enum"
      NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "sync_error"
      text
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "last_synced_at"
      timestamptz
    `);

    /*
     * Canonical indexes expected by src/items/entities/item.entity.ts.
     */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_items_company_name"
      ON "items" (
        "company_id",
        "name"
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_items_company_barcode"
      ON "items" (
        "company_id",
        "barcode"
      )
      WHERE
        "barcode" IS NOT NULL
        AND "deleted_at" IS NULL
    `);

    /*
     * Normalize the canonical numeric column definitions.
     * TYPE USING keeps existing values.
     */
    await queryRunner.query(`
      ALTER TABLE "items"
      ALTER COLUMN "purchase_price"
      TYPE numeric(18,2)
      USING "purchase_price"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ALTER COLUMN "selling_price"
      TYPE numeric(18,2)
      USING "selling_price"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      ALTER COLUMN "opening_stock"
      TYPE numeric(18,3)
      USING "opening_stock"::numeric(18,3)
    `);

    /*
     * The canonical entity allows a longer unit field than the original
     * core migration.
     */
    await queryRunner.query(`
      ALTER TABLE "items"
      ALTER COLUMN "unit"
      TYPE varchar(30)
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_items_company_barcode"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_items_company_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "last_synced_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "sync_error"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "sync_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "tally_stock_item_id"
    `);

    /*
     * tally_item_name may have existed before this migration through
     * AddSalesOrderApprovalAndTallyItemName, so do not drop it here.
     */

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "hsn_code"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "track_inventory"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "minimum_stock"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "current_stock"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "tax_rate"
    `);

    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "barcode"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname =
            'items_sync_status_enum'
        ) THEN
          DROP TYPE
            "items_sync_status_enum";
        END IF;
      END
      $$;
    `);
  }
}
