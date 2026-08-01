import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesInvoices1786700000000
  implements MigrationInterface
{
  name = 'CreateSalesInvoices1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'sales_invoices_status_enum'
        ) THEN
          CREATE TYPE "public"."sales_invoices_status_enum"
          AS ENUM (
            'draft',
            'posted',
            'partially_paid',
            'paid',
            'cancelled'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "sales_order_id" uuid,
        "delivery_note_id" uuid,
        "invoice_number" character varying(50) NOT NULL,
        "customer_invoice_reference" character varying(120),
        "invoice_date" date NOT NULL,
        "due_date" date,
        "status" "public"."sales_invoices_status_enum"
          NOT NULL DEFAULT 'draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "shipping_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "paid_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "balance_due" numeric(18,2) NOT NULL DEFAULT 0,
        "billing_address" text,
        "shipping_address" text,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "posted_by" uuid,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_by" uuid,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_sales_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_invoices_subtotal"
          CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_sales_invoices_discount_total"
          CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_sales_invoices_tax_total"
          CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_sales_invoices_shipping_total"
          CHECK ("shipping_total" >= 0),
        CONSTRAINT "CHK_sales_invoices_grand_total"
          CHECK ("grand_total" >= 0),
        CONSTRAINT "CHK_sales_invoices_paid_amount"
          CHECK ("paid_amount" >= 0),
        CONSTRAINT "CHK_sales_invoices_balance_due"
          CHECK ("balance_due" >= 0),
        CONSTRAINT "CHK_sales_invoices_payment_total"
          CHECK ("paid_amount" + "balance_due" = "grand_total"),
        CONSTRAINT "CHK_sales_invoices_due_date"
          CHECK (
            "due_date" IS NULL
            OR "due_date" >= "invoice_date"
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_invoice_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "sales_order_item_id" uuid,
        "delivery_note_item_id" uuid,
        "item_name" character varying(200),
        "sku" character varying(100),
        "unit" character varying(40),
        "description" character varying(250),
        "quantity" numeric(18,4) NOT NULL,
        "unit_price" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_sales_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_invoice_items_quantity"
          CHECK ("quantity" > 0),
        CONSTRAINT "CHK_sales_invoice_items_unit_price"
          CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_sales_invoice_items_discount_percent"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),
        CONSTRAINT "CHK_sales_invoice_items_tax_percent"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoices_company"
      ON "sales_invoices" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoices_customer"
      ON "sales_invoices" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoices_sales_order"
      ON "sales_invoices" ("sales_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoices_delivery_note"
      ON "sales_invoices" ("delivery_note_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoices_status"
      ON "sales_invoices" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_sales_invoices_company_number"
      ON "sales_invoices" ("company_id", "invoice_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoice_items_invoice"
      ON "sales_invoice_items" ("sales_invoice_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_invoice_items_item"
      ON "sales_invoice_items" ("item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_sales_invoice_items_sales_order_item"
      ON "sales_invoice_items" ("sales_order_item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_sales_invoice_items_delivery_note_item"
      ON "sales_invoice_items" ("delivery_note_item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoices_customer'
        ) THEN
          ALTER TABLE "sales_invoices"
          ADD CONSTRAINT "FK_sales_invoices_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id")
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoices_sales_order'
        ) THEN
          ALTER TABLE "sales_invoices"
          ADD CONSTRAINT "FK_sales_invoices_sales_order"
          FOREIGN KEY ("sales_order_id")
          REFERENCES "sales_orders"("id")
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoices_delivery_note'
        ) THEN
          ALTER TABLE "sales_invoices"
          ADD CONSTRAINT "FK_sales_invoices_delivery_note"
          FOREIGN KEY ("delivery_note_id")
          REFERENCES "delivery_notes"("id")
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoice_items_invoice'
        ) THEN
          ALTER TABLE "sales_invoice_items"
          ADD CONSTRAINT "FK_sales_invoice_items_invoice"
          FOREIGN KEY ("sales_invoice_id")
          REFERENCES "sales_invoices"("id")
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoice_items_item'
        ) THEN
          ALTER TABLE "sales_invoice_items"
          ADD CONSTRAINT "FK_sales_invoice_items_item"
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoice_items_sales_order_item'
        ) THEN
          ALTER TABLE "sales_invoice_items"
          ADD CONSTRAINT "FK_sales_invoice_items_sales_order_item"
          FOREIGN KEY ("sales_order_item_id")
          REFERENCES "sales_order_items"("id")
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_invoice_items_delivery_note_item'
        ) THEN
          ALTER TABLE "sales_invoice_items"
          ADD CONSTRAINT "FK_sales_invoice_items_delivery_note_item"
          FOREIGN KEY ("delivery_note_item_id")
          REFERENCES "delivery_note_items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoice_items"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_invoice_items_delivery_note_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoice_items"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_invoice_items_sales_order_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoice_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_invoice_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoice_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_invoice_items_invoice"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoices"
      DROP CONSTRAINT IF EXISTS "FK_sales_invoices_delivery_note"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoices"
      DROP CONSTRAINT IF EXISTS "FK_sales_invoices_sales_order"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_invoices"
      DROP CONSTRAINT IF EXISTS "FK_sales_invoices_customer"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_invoice_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_invoices"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."sales_invoices_status_enum"
    `);
  }
}
