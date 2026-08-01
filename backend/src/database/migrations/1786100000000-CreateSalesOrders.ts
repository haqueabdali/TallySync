import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesOrders1786100000000
  implements MigrationInterface
{
  name = 'CreateSalesOrders1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'sales_orders_status_enum'
        ) THEN
          CREATE TYPE "public"."sales_orders_status_enum"
          AS ENUM (
            'draft',
            'submitted',
            'approved',
            'confirmed',
            'partially_delivered',
            'delivered',
            'fulfilled',
            'cancelled'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "warehouse_id" uuid,
        "sales_quotation_id" uuid,
        "order_number" character varying(50) NOT NULL,
        "order_date" date NOT NULL,
        "expected_delivery_date" date,
        "status" "public"."sales_orders_status_enum"
          NOT NULL DEFAULT 'draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "shipping_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "customer_reference" character varying(120),
        "shipping_address" text,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_sales_orders" PRIMARY KEY ("id")
      )
    `);

    /*
     * The project may already contain an older sales_orders table.
     * CREATE TABLE IF NOT EXISTS does not add missing columns, so every
     * column required by the current entity is added safely below.
     */
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "warehouse_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "sales_quotation_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "expected_delivery_date" date
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "currency"
      character varying(3) NOT NULL DEFAULT 'EUR'
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "subtotal"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "discount_total"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "tax_total"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "shipping_total"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "grand_total"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "customer_reference"
      character varying(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "shipping_address" text
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "notes" text
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "created_by" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "updated_by" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "created_at"
      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "updated_at"
      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "deleted_at"
      TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales_order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sales_order_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "sales_quotation_item_id" uuid,
        "item_name" character varying(200),
        "sku" character varying(100),
        "unit" character varying(40),
        "description" character varying(250),
        "quantity" numeric(18,4) NOT NULL,
        "delivered_quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "unit_price" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "line_discount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_tax" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_sales_order_items" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "sales_quotation_item_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "item_name" character varying(200)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "sku" character varying(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "unit" character varying(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "description" character varying(250)
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "delivered_quantity"
      numeric(18,4) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "discount_percent"
      numeric(7,4) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "tax_percent"
      numeric(7,4) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "line_subtotal"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "line_discount"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "line_tax"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "discount_amount"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "tax_amount"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD COLUMN IF NOT EXISTS "line_total"
      numeric(18,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_orders_company"
      ON "sales_orders" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_orders_customer"
      ON "sales_orders" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_orders_warehouse"
      ON "sales_orders" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_orders_quotation"
      ON "sales_orders" ("sales_quotation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_orders_status"
      ON "sales_orders" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_sales_orders_company_number"
      ON "sales_orders" ("company_id", "order_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_order_items_order"
      ON "sales_order_items" ("sales_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sales_order_items_item"
      ON "sales_order_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_orders_customer'
        ) THEN
          ALTER TABLE "sales_orders"
          ADD CONSTRAINT "FK_sales_orders_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_orders_warehouse'
        ) THEN
          ALTER TABLE "sales_orders"
          ADD CONSTRAINT "FK_sales_orders_warehouse"
          FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_orders_quotation'
        ) THEN
          ALTER TABLE "sales_orders"
          ADD CONSTRAINT "FK_sales_orders_quotation"
          FOREIGN KEY ("sales_quotation_id")
          REFERENCES "sales_quotations"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_order_items_order'
        ) THEN
          ALTER TABLE "sales_order_items"
          ADD CONSTRAINT "FK_sales_order_items_order"
          FOREIGN KEY ("sales_order_id")
          REFERENCES "sales_orders"("id")
          ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_order_items_item'
        ) THEN
          ALTER TABLE "sales_order_items"
          ADD CONSTRAINT "FK_sales_order_items_item"
          FOREIGN KEY ("item_id")
          REFERENCES "items"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_sales_order_items_quotation_item'
        ) THEN
          ALTER TABLE "sales_order_items"
          ADD CONSTRAINT "FK_sales_order_items_quotation_item"
          FOREIGN KEY ("sales_quotation_item_id")
          REFERENCES "sales_quotation_items"("id")
          ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_order_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_order_items_quotation_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_order_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_order_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_order_items"
      DROP CONSTRAINT IF EXISTS "FK_sales_order_items_order"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_orders"
      DROP CONSTRAINT IF EXISTS "FK_sales_orders_quotation"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_orders"
      DROP CONSTRAINT IF EXISTS "FK_sales_orders_warehouse"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "sales_orders"
      DROP CONSTRAINT IF EXISTS "FK_sales_orders_customer"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "sales_order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_orders"`);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."sales_orders_status_enum"
    `);
  }
}