import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliveryNotes1786600000000
  implements MigrationInterface
{
  name = 'CreateDeliveryNotes1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'delivery_notes_status_enum'
        ) THEN
          CREATE TYPE "public"."delivery_notes_status_enum"
          AS ENUM ('draft', 'posted', 'cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "delivery_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "sales_order_id" uuid NOT NULL,
        "delivery_note_number" character varying(50) NOT NULL,
        "delivery_date" date NOT NULL,
        "status" "public"."delivery_notes_status_enum"
          NOT NULL DEFAULT 'draft',
        "shipping_address" text,
        "tracking_number" character varying(120),
        "carrier_name" character varying(150),
        "vehicle_number" character varying(80),
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
        CONSTRAINT "PK_delivery_notes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "delivery_note_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "delivery_note_id" uuid NOT NULL,
        "sales_order_item_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "item_name" character varying(200),
        "sku" character varying(100),
        "unit" character varying(40),
        "ordered_quantity" numeric(18,4) NOT NULL,
        "previously_delivered_quantity"
          numeric(18,4) NOT NULL DEFAULT 0,
        "delivered_quantity" numeric(18,4) NOT NULL,
        "unit_price" numeric(18,4) NOT NULL DEFAULT 0,
        "notes" text,
        CONSTRAINT "PK_delivery_note_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_delivery_note_items_ordered_quantity"
          CHECK ("ordered_quantity" > 0),
        CONSTRAINT "CHK_delivery_note_items_previous_quantity"
          CHECK ("previously_delivered_quantity" >= 0),
        CONSTRAINT "CHK_delivery_note_items_delivered_quantity"
          CHECK ("delivered_quantity" > 0),
        CONSTRAINT "CHK_delivery_note_items_total_quantity"
          CHECK (
            "previously_delivered_quantity"
            + "delivered_quantity"
            <= "ordered_quantity"
          ),
        CONSTRAINT "CHK_delivery_note_items_unit_price"
          CHECK ("unit_price" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_notes_company"
      ON "delivery_notes" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_notes_customer"
      ON "delivery_notes" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_notes_warehouse"
      ON "delivery_notes" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_notes_sales_order"
      ON "delivery_notes" ("sales_order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_notes_status"
      ON "delivery_notes" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_delivery_notes_company_number"
      ON "delivery_notes"
        ("company_id", "delivery_note_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_note_items_note"
      ON "delivery_note_items" ("delivery_note_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_delivery_note_items_sales_order_item"
      ON "delivery_note_items" ("sales_order_item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_delivery_note_items_item"
      ON "delivery_note_items" ("item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_delivery_notes_customer'
        ) THEN
          ALTER TABLE "delivery_notes"
          ADD CONSTRAINT "FK_delivery_notes_customer"
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
          WHERE conname = 'FK_delivery_notes_warehouse'
        ) THEN
          ALTER TABLE "delivery_notes"
          ADD CONSTRAINT "FK_delivery_notes_warehouse"
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
          WHERE conname = 'FK_delivery_notes_sales_order'
        ) THEN
          ALTER TABLE "delivery_notes"
          ADD CONSTRAINT "FK_delivery_notes_sales_order"
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
          WHERE conname = 'FK_delivery_note_items_note'
        ) THEN
          ALTER TABLE "delivery_note_items"
          ADD CONSTRAINT "FK_delivery_note_items_note"
          FOREIGN KEY ("delivery_note_id")
          REFERENCES "delivery_notes"("id")
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
          WHERE conname = 'FK_delivery_note_items_sales_order_item'
        ) THEN
          ALTER TABLE "delivery_note_items"
          ADD CONSTRAINT "FK_delivery_note_items_sales_order_item"
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
          WHERE conname = 'FK_delivery_note_items_item'
        ) THEN
          ALTER TABLE "delivery_note_items"
          ADD CONSTRAINT "FK_delivery_note_items_item"
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
      ALTER TABLE IF EXISTS "delivery_note_items"
      DROP CONSTRAINT IF EXISTS "FK_delivery_note_items_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "delivery_note_items"
      DROP CONSTRAINT IF EXISTS
        "FK_delivery_note_items_sales_order_item"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "delivery_note_items"
      DROP CONSTRAINT IF EXISTS "FK_delivery_note_items_note"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "delivery_notes"
      DROP CONSTRAINT IF EXISTS "FK_delivery_notes_sales_order"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "delivery_notes"
      DROP CONSTRAINT IF EXISTS "FK_delivery_notes_warehouse"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "delivery_notes"
      DROP CONSTRAINT IF EXISTS "FK_delivery_notes_customer"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "delivery_note_items"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "delivery_notes"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."delivery_notes_status_enum"
    `);
  }
}
