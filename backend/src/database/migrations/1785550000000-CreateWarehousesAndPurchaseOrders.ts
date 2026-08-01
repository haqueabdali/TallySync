import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehousesAndPurchaseOrders1785550000000
  implements MigrationInterface
{
  name = 'CreateWarehousesAndPurchaseOrders1785550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "warehouses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "warehouse_code" character varying(30) NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" text,
        "contact_person" character varying(150),
        "phone" character varying(40),
        "email" character varying(180),
        "address" text,
        "city" character varying(100),
        "state" character varying(100),
        "postal_code" character varying(30),
        "country" character varying(100),
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_warehouses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_warehouses_company"
      ON "warehouses" ("company_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_warehouses_company_code"
      ON "warehouses" ("company_id", "warehouse_code")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_warehouses_company'
        ) THEN
          ALTER TABLE "warehouses"
          ADD CONSTRAINT "FK_warehouses_company"
          FOREIGN KEY ("company_id")
          REFERENCES "companies"("id")
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
          FROM pg_type
          WHERE typname = 'purchase_orders_status_enum'
        ) THEN
          CREATE TYPE "public"."purchase_orders_status_enum"
          AS ENUM (
            'draft',
            'sent',
            'partially_received',
            'received',
            'cancelled'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "po_number" character varying(40) NOT NULL,
        "po_date" date NOT NULL,
        "expected_date" date,
        "status" "public"."purchase_orders_status_enum"
          NOT NULL DEFAULT 'draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_total" numeric(18,2) NOT NULL DEFAULT 0,
        "shipping_total" numeric(18,2) NOT NULL DEFAULT 0,
        "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_orders_subtotal"
          CHECK ("subtotal" >= 0),
        CONSTRAINT "CHK_purchase_orders_discount_total"
          CHECK ("discount_total" >= 0),
        CONSTRAINT "CHK_purchase_orders_tax_total"
          CHECK ("tax_total" >= 0),
        CONSTRAINT "CHK_purchase_orders_shipping_total"
          CHECK ("shipping_total" >= 0),
        CONSTRAINT "CHK_purchase_orders_grand_total"
          CHECK ("grand_total" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchase_order_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "description" character varying(250),
        "quantity" numeric(18,4) NOT NULL,
        "received_quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "unit_price" numeric(18,4) NOT NULL,
        "discount_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "tax_percent" numeric(7,4) NOT NULL DEFAULT 0,
        "line_subtotal" numeric(18,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "line_total" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_purchase_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_order_items_quantity"
          CHECK ("quantity" > 0),
        CONSTRAINT "CHK_purchase_order_items_received_quantity"
          CHECK (
            "received_quantity" >= 0
            AND "received_quantity" <= "quantity"
          ),
        CONSTRAINT "CHK_purchase_order_items_unit_price"
          CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_purchase_order_items_discount_percent"
          CHECK (
            "discount_percent" >= 0
            AND "discount_percent" <= 100
          ),
        CONSTRAINT "CHK_purchase_order_items_tax_percent"
          CHECK (
            "tax_percent" >= 0
            AND "tax_percent" <= 100
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_orders_company"
      ON "purchase_orders" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_orders_supplier"
      ON "purchase_orders" ("supplier_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_orders_warehouse"
      ON "purchase_orders" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_orders_status"
      ON "purchase_orders" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_purchase_orders_company_number"
      ON "purchase_orders" ("company_id", "po_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_order_items_order"
      ON "purchase_order_items" ("purchase_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_purchase_order_items_item"
      ON "purchase_order_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_purchase_orders_company'
        ) THEN
          ALTER TABLE "purchase_orders"
          ADD CONSTRAINT "FK_purchase_orders_company"
          FOREIGN KEY ("company_id")
          REFERENCES "companies"("id")
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
          WHERE conname = 'FK_purchase_orders_supplier'
        ) THEN
          ALTER TABLE "purchase_orders"
          ADD CONSTRAINT "FK_purchase_orders_supplier"
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
          WHERE conname = 'FK_purchase_orders_warehouse'
        ) THEN
          ALTER TABLE "purchase_orders"
          ADD CONSTRAINT "FK_purchase_orders_warehouse"
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
          WHERE conname = 'FK_purchase_order_items_order'
        ) THEN
          ALTER TABLE "purchase_order_items"
          ADD CONSTRAINT "FK_purchase_order_items_order"
          FOREIGN KEY ("purchase_order_id")
          REFERENCES "purchase_orders"("id")
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
          WHERE conname = 'FK_purchase_order_items_item'
        ) THEN
          ALTER TABLE "purchase_order_items"
          ADD CONSTRAINT "FK_purchase_order_items_item"
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
      ALTER TABLE IF EXISTS "purchase_order_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_order_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_order_items"
      DROP CONSTRAINT IF EXISTS "FK_purchase_order_items_order"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_orders"
      DROP CONSTRAINT IF EXISTS "FK_purchase_orders_warehouse"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_orders"
      DROP CONSTRAINT IF EXISTS "FK_purchase_orders_supplier"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "purchase_orders"
      DROP CONSTRAINT IF EXISTS "FK_purchase_orders_company"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "purchase_order_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "purchase_orders"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."purchase_orders_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "warehouses"
      DROP CONSTRAINT IF EXISTS "FK_warehouses_company"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "warehouses"
    `);
  }
}
