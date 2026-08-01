import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseReturns1785900000000
  implements MigrationInterface
{
  name = 'CreatePurchaseReturns1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'purchase_returns_status_enum'
        ) THEN
          CREATE TYPE "public"."purchase_returns_status_enum"
          AS ENUM ('Draft', 'Posted', 'Cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "purchase_invoice_id" uuid,
        "goods_receipt_id" uuid,
        "return_number" character varying(50) NOT NULL,
        "return_date" date NOT NULL,
        "status" "public"."purchase_returns_status_enum"
          NOT NULL DEFAULT 'Draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "reason" text,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_purchase_returns" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_returns_subtotal"
          CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_purchase_returns_discount_total"
          CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_purchase_returns_tax_total"
          CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_purchase_returns_grand_total"
          CHECK ("grand_total" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_return_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchase_return_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "purchase_invoice_item_id" uuid,
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
        CONSTRAINT "PK_purchase_return_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_return_items_quantity"
          CHECK ("quantity" > 0),
        CONSTRAINT "CHK_purchase_return_items_unit_price"
          CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_purchase_return_items_discount_percent"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),
        CONSTRAINT "CHK_purchase_return_items_tax_percent"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_returns_company"
      ON "purchase_returns" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_returns_supplier"
      ON "purchase_returns" ("supplier_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_returns_warehouse"
      ON "purchase_returns" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_returns_purchase_invoice"
      ON "purchase_returns" ("purchase_invoice_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_purchase_returns_company_number"
      ON "purchase_returns" ("company_id", "return_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_return_items_return"
      ON "purchase_return_items" ("purchase_return_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_return_items_item"
      ON "purchase_return_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_purchase_returns_supplier'
        ) THEN
          ALTER TABLE "purchase_returns"
          ADD CONSTRAINT "FK_purchase_returns_supplier"
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
          WHERE conname = 'FK_purchase_returns_warehouse'
        ) THEN
          ALTER TABLE "purchase_returns"
          ADD CONSTRAINT "FK_purchase_returns_warehouse"
          FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses"("id")
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
          WHERE conname = 'FK_purchase_returns_purchase_invoice'
        ) THEN
          ALTER TABLE "purchase_returns"
          ADD CONSTRAINT "FK_purchase_returns_purchase_invoice"
          FOREIGN KEY ("purchase_invoice_id")
          REFERENCES "purchase_invoices"("id")
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
          WHERE conname = 'FK_purchase_returns_goods_receipt'
        ) THEN
          ALTER TABLE "purchase_returns"
          ADD CONSTRAINT "FK_purchase_returns_goods_receipt"
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
          WHERE conname = 'FK_purchase_return_items_return'
        ) THEN
          ALTER TABLE "purchase_return_items"
          ADD CONSTRAINT "FK_purchase_return_items_return"
          FOREIGN KEY ("purchase_return_id")
          REFERENCES "purchase_returns"("id")
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
          WHERE conname = 'FK_purchase_return_items_item'
        ) THEN
          ALTER TABLE "purchase_return_items"
          ADD CONSTRAINT "FK_purchase_return_items_item"
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
          WHERE conname = 'FK_purchase_return_items_invoice_item'
        ) THEN
          ALTER TABLE "purchase_return_items"
          ADD CONSTRAINT "FK_purchase_return_items_invoice_item"
          FOREIGN KEY ("purchase_invoice_item_id")
          REFERENCES "purchase_invoice_items"("id")
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
          WHERE conname = 'FK_purchase_return_items_grn_item'
        ) THEN
          ALTER TABLE "purchase_return_items"
          ADD CONSTRAINT "FK_purchase_return_items_grn_item"
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
      ALTER TABLE IF EXISTS "purchase_return_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_return_items_grn_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_return_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_return_items_invoice_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_return_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_return_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_return_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_return_items_return"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_returns"
      DROP CONSTRAINT IF EXISTS "FK_purchase_returns_goods_receipt"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_returns"
      DROP CONSTRAINT IF EXISTS "FK_purchase_returns_purchase_invoice"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_returns"
      DROP CONSTRAINT IF EXISTS "FK_purchase_returns_warehouse"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_returns"
      DROP CONSTRAINT IF EXISTS "FK_purchase_returns_supplier"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "purchase_return_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "purchase_returns"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."purchase_returns_status_enum"
    `);
  }
}
