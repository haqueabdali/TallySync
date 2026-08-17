import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AlignPurchaseInvoicesWithCurrentEntities1788040000000
  implements MigrationInterface
{
  name =
    'AlignPurchaseInvoicesWithCurrentEntities1788040000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * The original 178570 migration created purchase_invoices first.
     * The later 178730 migration used CREATE TABLE IF NOT EXISTS, so it
     * never upgraded the already-existing tables.
     *
     * Align the live tables with the current PurchaseInvoiceEntity and
     * PurchaseInvoiceItemEntity without dropping legacy columns/data.
     */

    await queryRunner.query(`
      ALTER TYPE "public"."purchase_invoices_status_enum"
      ADD VALUE IF NOT EXISTS 'PartiallyPaid'
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ADD COLUMN IF NOT EXISTS
        "shipping_total"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ADD COLUMN IF NOT EXISTS
        "billing_address"
      text
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ADD COLUMN IF NOT EXISTS
        "posted_by"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ADD COLUMN IF NOT EXISTS
        "posted_at"
      timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ADD COLUMN IF NOT EXISTS
        "cancelled_by"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ADD COLUMN IF NOT EXISTS
        "cancelled_at"
      timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "supplier_invoice_number"
      TYPE varchar(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "subtotal"
      TYPE numeric(18,2)
      USING "subtotal"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "discount_total"
      TYPE numeric(18,2)
      USING "discount_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "tax_total"
      TYPE numeric(18,2)
      USING "tax_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "grand_total"
      TYPE numeric(18,2)
      USING "grand_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "paid_amount"
      TYPE numeric(18,2)
      USING "paid_amount"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      ALTER COLUMN "balance_due"
      TYPE numeric(18,2)
      USING "balance_due"::numeric(18,2)
    `);

    /*
     * Current item entity uses unit_cost.
     * The old table used unit_price. Add unit_cost and copy legacy values.
     */
    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ADD COLUMN IF NOT EXISTS
        "unit_cost"
      numeric(18,4)
    `);

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
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "unit_cost"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ADD COLUMN IF NOT EXISTS
        "item_name"
      varchar(200)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ADD COLUMN IF NOT EXISTS
        "sku"
      varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ADD COLUMN IF NOT EXISTS
        "unit"
      varchar(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "quantity"
      TYPE numeric(18,4)
      USING "quantity"::numeric(18,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "discount_percent"
      TYPE numeric(7,4)
      USING "discount_percent"::numeric(7,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "tax_percent"
      TYPE numeric(7,4)
      USING "tax_percent"::numeric(7,4)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "line_subtotal"
      TYPE numeric(18,2)
      USING "line_subtotal"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "discount_amount"
      TYPE numeric(18,2)
      USING "discount_amount"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "tax_amount"
      TYPE numeric(18,2)
      USING "tax_amount"::numeric(18,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoice_items"
      ALTER COLUMN "line_total"
      TYPE numeric(18,2)
      USING "line_total"::numeric(18,2)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_purchase_invoices_status"
      ON "purchase_invoices" (
        "company_id",
        "status"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_purchase_invoice_items_po_item"
      ON "purchase_invoice_items" (
        "purchase_order_item_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_purchase_invoice_items_grn_item"
      ON "purchase_invoice_items" (
        "goods_receipt_item_id"
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_purchase_invoices_shipping_total'
        ) THEN
          ALTER TABLE "purchase_invoices"
          ADD CONSTRAINT
            "CHK_purchase_invoices_shipping_total"
          CHECK (
            "shipping_total" >= 0
          );
        END IF;
      END
      $$;
    `);

    /*
     * The entity/service calculates:
     * paid_amount + balance_due = grand_total.
     * Backfill before adding the defensive constraint.
     */
    await queryRunner.query(`
      UPDATE "purchase_invoices"
      SET "balance_due" =
        GREATEST(
          "grand_total" -
          "paid_amount",
          0
        )
      WHERE
        "paid_amount" +
        "balance_due" <>
        "grand_total"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_purchase_invoices_payment_total'
        ) THEN
          ALTER TABLE "purchase_invoices"
          ADD CONSTRAINT
            "CHK_purchase_invoices_payment_total"
          CHECK (
            "paid_amount" +
            "balance_due" =
            "grand_total"
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_purchase_invoices_due_date'
        ) THEN
          ALTER TABLE "purchase_invoices"
          ADD CONSTRAINT
            "CHK_purchase_invoices_due_date"
          CHECK (
            "due_date" IS NULL
            OR
            "due_date" >=
            "invoice_date"
          );
        END IF;
      END
      $$;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP CONSTRAINT IF EXISTS
        "CHK_purchase_invoices_due_date"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP CONSTRAINT IF EXISTS
        "CHK_purchase_invoices_payment_total"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP CONSTRAINT IF EXISTS
        "CHK_purchase_invoices_shipping_total"
    `);

    /*
     * Keep unit_cost/item metadata on rollback because dropping them can
     * destroy data created by the current application.
     * PostgreSQL enum values are likewise intentionally not removed.
     */

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP COLUMN IF EXISTS
        "cancelled_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP COLUMN IF EXISTS
        "cancelled_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP COLUMN IF EXISTS
        "posted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP COLUMN IF EXISTS
        "posted_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP COLUMN IF EXISTS
        "billing_address"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_invoices"
      DROP COLUMN IF EXISTS
        "shipping_total"
    `);
  }
}
