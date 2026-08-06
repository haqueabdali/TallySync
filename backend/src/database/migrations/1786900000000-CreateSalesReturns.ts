import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesReturns1786900000000
  implements MigrationInterface
{
  name = 'CreateSalesReturns1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'sales_returns_status_enum'
        ) THEN
          CREATE TYPE "public"."sales_returns_status_enum"
          AS ENUM ('draft', 'posted', 'reversed', 'cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "sales_invoice_id" uuid NOT NULL,
        "return_number" character varying(50) NOT NULL,
        "return_date" date NOT NULL,
        "status" "public"."sales_returns_status_enum"
          NOT NULL DEFAULT 'draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "reason" text,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "posted_by" uuid,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "reversed_by" uuid,
        "reversed_at" TIMESTAMP WITH TIME ZONE,
        "reversal_reason" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_sales_returns" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_returns_subtotal"
          CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_sales_returns_discount_total"
          CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_sales_returns_tax_total"
          CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_sales_returns_grand_total"
          CHECK ("grand_total" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_return_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_return_id" uuid NOT NULL,
        "sales_invoice_item_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "item_name" character varying(200),
        "sku" character varying(100),
        "unit" character varying(40),
        "invoiced_quantity" numeric(18,4) NOT NULL,
        "previously_returned_quantity"
          numeric(18,4) NOT NULL DEFAULT 0,
        "return_quantity" numeric(18,4) NOT NULL,
        "unit_price" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        "reason" text,
        CONSTRAINT "PK_sales_return_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_return_items_invoiced_quantity"
          CHECK ("invoiced_quantity" > 0),
        CONSTRAINT "CHK_sales_return_items_previous_quantity"
          CHECK ("previously_returned_quantity" >= 0),
        CONSTRAINT "CHK_sales_return_items_return_quantity"
          CHECK ("return_quantity" > 0),
        CONSTRAINT "CHK_sales_return_items_total_quantity"
          CHECK (
            "previously_returned_quantity"
            + "return_quantity"
            <= "invoiced_quantity"
          ),
        CONSTRAINT "CHK_sales_return_items_unit_price"
          CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_sales_return_items_discount_percent"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),
        CONSTRAINT "CHK_sales_return_items_tax_percent"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_returns_company"
      ON "sales_returns" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_returns_customer"
      ON "sales_returns" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_returns_warehouse"
      ON "sales_returns" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_returns_invoice"
      ON "sales_returns" ("sales_invoice_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_returns_status"
      ON "sales_returns" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_sales_returns_company_number"
      ON "sales_returns" ("company_id", "return_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_return_items_return"
      ON "sales_return_items" ("sales_return_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_sales_return_items_invoice_item"
      ON "sales_return_items" ("sales_invoice_item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_return_items_item"
      ON "sales_return_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_returns_customer'
        ) THEN
          ALTER TABLE "sales_returns"
          ADD CONSTRAINT "FK_sales_returns_customer"
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
          WHERE conname = 'FK_sales_returns_warehouse'
        ) THEN
          ALTER TABLE "sales_returns"
          ADD CONSTRAINT "FK_sales_returns_warehouse"
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
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_returns_invoice'
        ) THEN
          ALTER TABLE "sales_returns"
          ADD CONSTRAINT "FK_sales_returns_invoice"
          FOREIGN KEY ("sales_invoice_id")
          REFERENCES "sales_invoices"("id")
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
          WHERE conname = 'FK_sales_return_items_return'
        ) THEN
          ALTER TABLE "sales_return_items"
          ADD CONSTRAINT "FK_sales_return_items_return"
          FOREIGN KEY ("sales_return_id")
          REFERENCES "sales_returns"("id")
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
          WHERE conname = 'FK_sales_return_items_invoice_item'
        ) THEN
          ALTER TABLE "sales_return_items"
          ADD CONSTRAINT "FK_sales_return_items_invoice_item"
          FOREIGN KEY ("sales_invoice_item_id")
          REFERENCES "sales_invoice_items"("id")
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
          WHERE conname = 'FK_sales_return_items_item'
        ) THEN
          ALTER TABLE "sales_return_items"
          ADD CONSTRAINT "FK_sales_return_items_item"
          FOREIGN KEY ("item_id")
          REFERENCES "items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_return_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_return_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_return_items"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_return_items_invoice_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_return_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_return_items_return"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_returns"
      DROP CONSTRAINT IF EXISTS "FK_sales_returns_invoice"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_returns"
      DROP CONSTRAINT IF EXISTS "FK_sales_returns_warehouse"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_returns"
      DROP CONSTRAINT IF EXISTS "FK_sales_returns_customer"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_return_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_returns"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."sales_returns_status_enum"
    `);
  }
}
