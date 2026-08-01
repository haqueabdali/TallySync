import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoodsReceipts1785600000000 implements MigrationInterface {
  name = 'CreateGoodsReceipts1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'goods_receipts_status_enum'
        ) THEN
          CREATE TYPE "public"."goods_receipts_status_enum"
          AS ENUM ('Draft', 'Posted', 'Reversed');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "goods_receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "purchase_order_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "grn_number" character varying(40) NOT NULL,
        "grn_date" date NOT NULL,
        "status" "public"."goods_receipts_status_enum" NOT NULL DEFAULT 'Draft',
        "remarks" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_goods_receipts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "goods_receipt_id" uuid NOT NULL,
        "purchase_order_item_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "ordered_qty" numeric(18,4) NOT NULL DEFAULT 0,
        "received_qty" numeric(18,4) NOT NULL,
        "accepted_qty" numeric(18,4) NOT NULL,
        "rejected_qty" numeric(18,4) NOT NULL DEFAULT 0,
        "unit_cost" numeric(18,4) NOT NULL DEFAULT 0,
        "remarks" text,
        CONSTRAINT "PK_goods_receipt_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_goods_receipt_items_received_qty" CHECK ("received_qty" > 0),
        CONSTRAINT "CHK_goods_receipt_items_accepted_qty" CHECK ("accepted_qty" >= 0),
        CONSTRAINT "CHK_goods_receipt_items_rejected_qty" CHECK ("rejected_qty" >= 0),
        CONSTRAINT "CHK_goods_receipt_items_quantities" CHECK ("accepted_qty" + "rejected_qty" = "received_qty"),
        CONSTRAINT "CHK_goods_receipt_items_unit_cost" CHECK ("unit_cost" >= 0)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_goods_receipts_company" ON "goods_receipts" ("company_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_goods_receipts_purchase_order" ON "goods_receipts" ("purchase_order_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_goods_receipts_warehouse" ON "goods_receipts" ("warehouse_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_goods_receipts_company_number" ON "goods_receipts" ("company_id", "grn_number") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_goods_receipt_items_receipt" ON "goods_receipt_items" ("goods_receipt_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_goods_receipt_items_po_item" ON "goods_receipt_items" ("purchase_order_item_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_goods_receipt_items_item" ON "goods_receipt_items" ("item_id")`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_goods_receipts_purchase_order') THEN
          ALTER TABLE "goods_receipts"
          ADD CONSTRAINT "FK_goods_receipts_purchase_order"
          FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_goods_receipts_warehouse') THEN
          ALTER TABLE "goods_receipts"
          ADD CONSTRAINT "FK_goods_receipts_warehouse"
          FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_goods_receipt_items_receipt') THEN
          ALTER TABLE "goods_receipt_items"
          ADD CONSTRAINT "FK_goods_receipt_items_receipt"
          FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_goods_receipt_items_po_item') THEN
          ALTER TABLE "goods_receipt_items"
          ADD CONSTRAINT "FK_goods_receipt_items_po_item"
          FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_goods_receipt_items_item') THEN
          ALTER TABLE "goods_receipt_items"
          ADD CONSTRAINT "FK_goods_receipt_items_item"
          FOREIGN KEY ("item_id") REFERENCES "items"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS "goods_receipt_items" DROP CONSTRAINT IF EXISTS "FK_goods_receipt_items_item"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "goods_receipt_items" DROP CONSTRAINT IF EXISTS "FK_goods_receipt_items_po_item"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "goods_receipt_items" DROP CONSTRAINT IF EXISTS "FK_goods_receipt_items_receipt"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "goods_receipts" DROP CONSTRAINT IF EXISTS "FK_goods_receipts_warehouse"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "goods_receipts" DROP CONSTRAINT IF EXISTS "FK_goods_receipts_purchase_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipt_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."goods_receipts_status_enum"`);
  }
}
