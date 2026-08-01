import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesQuotations1786000000000
  implements MigrationInterface
{
  name = 'CreateSalesQuotations1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'sales_quotations_status_enum'
        ) THEN
          CREATE TYPE "public"."sales_quotations_status_enum"
          AS ENUM (
            'Draft',
            'Sent',
            'Accepted',
            'Rejected',
            'Expired',
            'Cancelled'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_quotations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "quotation_number" character varying(50) NOT NULL,
        "quotation_date" date NOT NULL,
        "valid_until" date,
        "status" "public"."sales_quotations_status_enum"
          NOT NULL DEFAULT 'Draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "shipping_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "customer_reference" character varying(120),
        "terms" text,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_sales_quotations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_quotations_subtotal"
          CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_sales_quotations_discount_total"
          CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_sales_quotations_tax_total"
          CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_sales_quotations_shipping_total"
          CHECK ("shipping_total" >= 0),
        CONSTRAINT "CHK_sales_quotations_grand_total"
          CHECK ("grand_total" >= 0),
        CONSTRAINT "CHK_sales_quotations_valid_until"
          CHECK (
            "valid_until" IS NULL
            OR "valid_until" >= "quotation_date"
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_quotation_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_quotation_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "description" character varying(250),
        "quantity" numeric(18,4) NOT NULL,
        "unit_price" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_sales_quotation_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sales_quotation_items_quantity"
          CHECK ("quantity" > 0),
        CONSTRAINT "CHK_sales_quotation_items_unit_price"
          CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_sales_quotation_items_discount_percent"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),
        CONSTRAINT "CHK_sales_quotation_items_tax_percent"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_quotations_company"
      ON "sales_quotations" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_quotations_customer"
      ON "sales_quotations" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_quotations_status"
      ON "sales_quotations" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_sales_quotations_company_number"
      ON "sales_quotations" ("company_id", "quotation_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_sales_quotation_items_quotation"
      ON "sales_quotation_items" ("sales_quotation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_sales_quotation_items_item"
      ON "sales_quotation_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_sales_quotations_customer'
        ) THEN
          ALTER TABLE "sales_quotations"
          ADD CONSTRAINT "FK_sales_quotations_customer"
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
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_sales_quotation_items_quotation'
        ) THEN
          ALTER TABLE "sales_quotation_items"
          ADD CONSTRAINT "FK_sales_quotation_items_quotation"
          FOREIGN KEY ("sales_quotation_id")
          REFERENCES "sales_quotations"("id")
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
          WHERE conname = 'FK_sales_quotation_items_item'
        ) THEN
          ALTER TABLE "sales_quotation_items"
          ADD CONSTRAINT "FK_sales_quotation_items_item"
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
      ALTER TABLE IF EXISTS "sales_quotation_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_quotation_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_quotation_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_quotation_items_quotation"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_quotations"
      DROP CONSTRAINT IF EXISTS "FK_sales_quotations_customer"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_quotation_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_quotations"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."sales_quotations_status_enum"
    `);
  }
}