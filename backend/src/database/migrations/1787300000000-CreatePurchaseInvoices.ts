import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseInvoices1787300000000
  implements MigrationInterface
{
  name = 'CreatePurchaseInvoices1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'purchase_invoices_status_enum'
        ) THEN
          CREATE TYPE "public"."purchase_invoices_status_enum"
          AS ENUM (
  'Draft',
  'Posted',
  'PartiallyPaid',
  'Paid',
  'Cancelled'
);
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
        "supplier_invoice_number" character varying(120),
        "invoice_date" date NOT NULL,
        "due_date" date,
        "status" "public"."purchase_invoices_status_enum" NOT NULL DEFAULT 'Draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "shipping_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "paid_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "balance_due" numeric(18,2) NOT NULL DEFAULT 0,
        "billing_address" text,
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
        CONSTRAINT "PK_purchase_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_invoices_subtotal" CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_purchase_invoices_discount_total" CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_tax_total" CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_shipping_total" CHECK ("shipping_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_grand_total" CHECK ("grand_total" >= 0),
        CONSTRAINT "CHK_purchase_invoices_paid_amount" CHECK ("paid_amount" >= 0),
        CONSTRAINT "CHK_purchase_invoices_balance_due" CHECK ("balance_due" >= 0),
        CONSTRAINT "CHK_purchase_invoices_payment_total" CHECK ("paid_amount" + "balance_due" = "grand_total"),
        CONSTRAINT "CHK_purchase_invoices_due_date" CHECK ("due_date" IS NULL OR "due_date" >= "invoice_date")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchase_invoice_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "purchase_order_item_id" uuid,
        "goods_receipt_item_id" uuid,
        "item_name" character varying(200),
        "sku" character varying(100),
        "unit" character varying(40),
        "description" character varying(250),
        "quantity" numeric(18,4) NOT NULL,
        "unit_cost" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_purchase_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_invoice_items_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_purchase_invoice_items_unit_cost" CHECK ("unit_cost" >= 0),
        CONSTRAINT "CHK_purchase_invoice_items_discount_percent" CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100),
        CONSTRAINT "CHK_purchase_invoice_items_tax_percent" CHECK ("tax_percent" >= 0 AND "tax_percent" <= 100)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_company" ON "purchase_invoices" ("company_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_supplier" ON "purchase_invoices" ("supplier_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_purchase_order" ON "purchase_invoices" ("purchase_order_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_goods_receipt" ON "purchase_invoices" ("goods_receipt_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoices_status" ON "purchase_invoices" ("company_id", "status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_purchase_invoices_company_number" ON "purchase_invoices" ("company_id", "invoice_number") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoice_items_invoice" ON "purchase_invoice_items" ("purchase_invoice_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoice_items_item" ON "purchase_invoice_items" ("item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoice_items_po_item" ON "purchase_invoice_items" ("purchase_order_item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_purchase_invoice_items_grn_item" ON "purchase_invoice_items" ("goods_receipt_item_id")`);

    const foreignKeys = [
      ['FK_purchase_invoices_supplier', 'purchase_invoices', 'supplier_id', 'suppliers', 'RESTRICT'],
      ['FK_purchase_invoices_purchase_order', 'purchase_invoices', 'purchase_order_id', 'purchase_orders', 'RESTRICT'],
      ['FK_purchase_invoices_goods_receipt', 'purchase_invoices', 'goods_receipt_id', 'goods_receipts', 'RESTRICT'],
      ['FK_purchase_invoice_items_invoice', 'purchase_invoice_items', 'purchase_invoice_id', 'purchase_invoices', 'CASCADE'],
      ['FK_purchase_invoice_items_item', 'purchase_invoice_items', 'item_id', 'items', 'RESTRICT'],
      ['FK_purchase_invoice_items_po_item', 'purchase_invoice_items', 'purchase_order_item_id', 'purchase_order_items', 'RESTRICT'],
      ['FK_purchase_invoice_items_grn_item', 'purchase_invoice_items', 'goods_receipt_item_id', 'goods_receipt_items', 'RESTRICT'],
    ] as const;

    for (const [name, table, column, target, onDelete] of foreignKeys) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
            ALTER TABLE "${table}"
            ADD CONSTRAINT "${name}"
            FOREIGN KEY ("${column}") REFERENCES "${target}"("id")
            ON DELETE ${onDelete} ON UPDATE NO ACTION;
          END IF;
        END
        $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const constraints = [
      ['purchase_invoice_items', 'FK_purchase_invoice_items_grn_item'],
      ['purchase_invoice_items', 'FK_purchase_invoice_items_po_item'],
      ['purchase_invoice_items', 'FK_purchase_invoice_items_item'],
      ['purchase_invoice_items', 'FK_purchase_invoice_items_invoice'],
      ['purchase_invoices', 'FK_purchase_invoices_goods_receipt'],
      ['purchase_invoices', 'FK_purchase_invoices_purchase_order'],
      ['purchase_invoices', 'FK_purchase_invoices_supplier'],
    ] as const;

    for (const [table, name] of constraints) {
      await queryRunner.query(`ALTER TABLE IF EXISTS "${table}" DROP CONSTRAINT IF EXISTS "${name}"`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_invoice_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_invoices"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."purchase_invoices_status_enum"`);
  }
}
