import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseInvoices1785700000000
  implements MigrationInterface
{
  name = 'CreatePurchaseInvoices1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'purchase_invoices_status_enum'
        ) THEN
          CREATE TYPE "public"."purchase_invoices_status_enum"
          AS ENUM ('Draft', 'Posted', 'Paid', 'Cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "purchase_order_id" uuid,
        "goods_receipt_id" uuid,
        "invoice_number" character varying(50) NOT NULL,
        "supplier_invoice_number" character varying(100),
        "invoice_date" date NOT NULL,
        "due_date" date,
        "status" "public"."purchase_invoices_status_enum"
          NOT NULL DEFAULT 'Draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "paid_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "balance_due" numeric(18,2) NOT NULL DEFAULT 0,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_purchase_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_invoices_subtotal"
          CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_purchase_invoices_discount_total"
          CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_tax_total"
          CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_grand_total"
          CHECK ("grand_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_paid_amount"
          CHECK ("paid_amount" >= 0),
        CONSTRAINT "CHK_purchase_invoices_balance_due"
          CHECK ("balance_due" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchase_invoice_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "purchase_order_item_id" uuid,
        "goods_receipt_item_id" uuid,
        "description" character varying(250),
        "quantity" numeric(18,4) NOT NULL,
        "unit_price" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_purchase_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_invoice_items_quantity"
          CHECK ("quantity" > 0),
        CONSTRAINT "CHK_purchase_invoice_items_unit_price"
          CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_purchase_invoice_items_discount_percent"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),
        CONSTRAINT "CHK_purchase_invoice_items_tax_percent"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_company"
      ON "purchase_invoices" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_supplier"
      ON "purchase_invoices" ("supplier_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_purchase_order"
      ON "purchase_invoices" ("purchase_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_goods_receipt"
      ON "purchase_invoices" ("goods_receipt_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_purchase_invoices_company_number"
      ON "purchase_invoices" ("company_id", "invoice_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_invoice_items_invoice"
      ON "purchase_invoice_items" ("purchase_invoice_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_invoice_items_item"
      ON "purchase_invoice_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_purchase_invoices_supplier'
        ) THEN
          ALTER TABLE "purchase_invoices"
          ADD CONSTRAINT "FK_purchase_invoices_supplier"
          FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_purchase_invoices_purchase_order'
        ) THEN
          ALTER TABLE "purchase_invoices"
          ADD CONSTRAINT "FK_purchase_invoices_purchase_order"
          FOREIGN KEY ("purchase_order_id")
          REFERENCES "purchase_orders"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_purchase_invoices_goods_receipt'
        ) THEN
          ALTER TABLE "purchase_invoices"
          ADD CONSTRAINT "FK_purchase_invoices_goods_receipt"
          FOREIGN KEY ("goods_receipt_id")
          REFERENCES "goods_receipts"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_purchase_invoice_items_invoice'
        ) THEN
          ALTER TABLE "purchase_invoice_items"
          ADD CONSTRAINT "FK_purchase_invoice_items_invoice"
          FOREIGN KEY ("purchase_invoice_id")
          REFERENCES "purchase_invoices"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_purchase_invoice_items_item'
        ) THEN
          ALTER TABLE "purchase_invoice_items"
          ADD CONSTRAINT "FK_purchase_invoice_items_item"
          FOREIGN KEY ("item_id")
          REFERENCES "items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_purchase_invoice_items_po_item'
        ) THEN
          ALTER TABLE "purchase_invoice_items"
          ADD CONSTRAINT "FK_purchase_invoice_items_po_item"
          FOREIGN KEY ("purchase_order_item_id")
          REFERENCES "purchase_order_items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_purchase_invoice_items_grn_item'
        ) THEN
          ALTER TABLE "purchase_invoice_items"
          ADD CONSTRAINT "FK_purchase_invoice_items_grn_item"
          FOREIGN KEY ("goods_receipt_item_id")
          REFERENCES "goods_receipt_items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoice_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoice_items_grn_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoice_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoice_items_po_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoice_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoice_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoice_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoice_items_invoice"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoices"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoices_goods_receipt"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoices"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoices_purchase_order"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_invoices"
      DROP CONSTRAINT IF EXISTS "FK_purchase_invoices_supplier"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "purchase_invoice_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "purchase_invoices"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."purchase_invoices_status_enum"
    `);
  }
}
