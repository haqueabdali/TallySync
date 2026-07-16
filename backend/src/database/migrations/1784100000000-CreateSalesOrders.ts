import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesOrders1784100000000 implements MigrationInterface {
  name = 'CreateSalesOrders1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."sales_order_status_enum"
      AS ENUM (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'fulfilled',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."sales_order_sync_status_enum"
      AS ENUM (
        'pending',
        'synced',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL
          DEFAULT uuid_generate_v4(),

        "company_id" uuid NOT NULL,

        "name" character varying(255) NOT NULL,

        "email" character varying(255),

        "phone" character varying(32),

        "address" text,

        "tally_ledger_name"
          character varying(255),

        "credit_limit"
          numeric(15,2) NOT NULL DEFAULT 0,

        "is_active"
          boolean NOT NULL DEFAULT true,

        "created_at"
          TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),

        "updated_at"
          TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),

        "deleted_at"
          TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "PK_customers"
          PRIMARY KEY ("id"),

        CONSTRAINT "CHK_customers_credit_limit"
          CHECK ("credit_limit" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customers_company_id"
      ON "customers" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customers_name"
      ON "customers" ("company_id", "name")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
        "UQ_customers_company_email"
      ON "customers" ("company_id", LOWER("email"))
      WHERE
        "email" IS NOT NULL
        AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "sales_orders" (
        "id" uuid NOT NULL
          DEFAULT uuid_generate_v4(),

        "company_id" uuid NOT NULL,

        "customer_id" uuid NOT NULL,

        "created_by" uuid NOT NULL,

        "order_number"
          character varying(64) NOT NULL,

        "order_date" date NOT NULL,

        "expected_delivery_date" date,

        "status"
          "public"."sales_order_status_enum"
          NOT NULL DEFAULT 'draft',

        "subtotal"
          numeric(15,2) NOT NULL DEFAULT 0,

        "tax_total"
          numeric(15,2) NOT NULL DEFAULT 0,

        "discount_total"
          numeric(15,2) NOT NULL DEFAULT 0,

        "grand_total"
          numeric(15,2) NOT NULL DEFAULT 0,

        "notes" text,

        "approval_required"
          boolean NOT NULL DEFAULT false,

        "approved_by" uuid,

        "approved_at"
          TIMESTAMP WITH TIME ZONE,

        "rejection_reason" text,

        "sync_status"
          "public"."sales_order_sync_status_enum"
          NOT NULL DEFAULT 'pending',

        "last_synced_at"
          TIMESTAMP WITH TIME ZONE,

        "created_at"
          TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),

        "updated_at"
          TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),

        "deleted_at"
          TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "PK_sales_orders"
          PRIMARY KEY ("id"),

        CONSTRAINT "CHK_sales_orders_subtotal"
          CHECK ("subtotal" >= 0),

        CONSTRAINT "CHK_sales_orders_tax_total"
          CHECK ("tax_total" >= 0),

        CONSTRAINT "CHK_sales_orders_discount_total"
          CHECK ("discount_total" >= 0),

        CONSTRAINT "CHK_sales_orders_grand_total"
          CHECK ("grand_total" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_orders_company_id"
      ON "sales_orders" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_orders_customer_id"
      ON "sales_orders" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_orders_created_by"
      ON "sales_orders" ("created_by")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_orders_status"
      ON "sales_orders" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_orders_order_date"
      ON "sales_orders" ("company_id", "order_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_orders_sync_status"
      ON "sales_orders" (
        "company_id",
        "sync_status"
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
        "UQ_sales_orders_company_number"
      ON "sales_orders" (
        "company_id",
        "order_number"
      )
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "sales_order_items" (
        "id" uuid NOT NULL
          DEFAULT uuid_generate_v4(),

        "sales_order_id" uuid NOT NULL,

        "item_id" uuid NOT NULL,

        "item_name"
          character varying(255) NOT NULL,

        "sku" character varying(128),

        "quantity"
          numeric(15,4) NOT NULL,

        "unit"
          character varying(32) NOT NULL,

        "unit_price"
          numeric(15,4) NOT NULL,

        "discount_percent"
          numeric(5,2) NOT NULL DEFAULT 0,

        "tax_percent"
          numeric(5,2) NOT NULL DEFAULT 0,

        "line_subtotal"
          numeric(15,2) NOT NULL,

        "line_discount"
          numeric(15,2) NOT NULL,

        "line_tax"
          numeric(15,2) NOT NULL,

        "line_total"
          numeric(15,2) NOT NULL,

        "created_at"
          TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),

        "updated_at"
          TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),

        CONSTRAINT "PK_sales_order_items"
          PRIMARY KEY ("id"),

        CONSTRAINT "CHK_sales_order_items_quantity"
          CHECK ("quantity" > 0),

        CONSTRAINT "CHK_sales_order_items_unit_price"
          CHECK ("unit_price" >= 0),

        CONSTRAINT "CHK_sales_order_items_discount"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),

        CONSTRAINT "CHK_sales_order_items_tax"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          ),

        CONSTRAINT "CHK_sales_order_items_subtotal"
          CHECK ("line_subtotal" >= 0),

        CONSTRAINT "CHK_sales_order_items_discount_total"
          CHECK ("line_discount" >= 0),

        CONSTRAINT "CHK_sales_order_items_tax_total"
          CHECK ("line_tax" >= 0),

        CONSTRAINT "CHK_sales_order_items_total"
          CHECK ("line_total" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_order_items_order"
      ON "sales_order_items" ("sales_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sales_order_items_item"
      ON "sales_order_items" ("item_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD CONSTRAINT "FK_customers_company"
      FOREIGN KEY ("company_id")
      REFERENCES "companies"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD CONSTRAINT "FK_sales_orders_company"
      FOREIGN KEY ("company_id")
      REFERENCES "companies"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD CONSTRAINT "FK_sales_orders_customer"
      FOREIGN KEY ("customer_id")
      REFERENCES "customers"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD CONSTRAINT "FK_sales_orders_created_by"
      FOREIGN KEY ("created_by")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD CONSTRAINT "FK_sales_orders_approved_by"
      FOREIGN KEY ("approved_by")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD CONSTRAINT "FK_sales_order_items_order"
      FOREIGN KEY ("sales_order_id")
      REFERENCES "sales_orders"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      ADD CONSTRAINT "FK_sales_order_items_item"
      FOREIGN KEY ("item_id")
      REFERENCES "items"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_order_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_order_items"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_order_items_order"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_orders_approved_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_orders_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_orders_customer"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP CONSTRAINT IF EXISTS
        "FK_sales_orders_company"
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP CONSTRAINT IF EXISTS
        "FK_customers_company"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_order_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "sales_orders"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "customers"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."sales_order_sync_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."sales_order_status_enum"
    `);
  }
}
