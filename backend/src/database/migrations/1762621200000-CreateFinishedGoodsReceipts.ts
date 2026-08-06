import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinishedGoodsReceipts1762621200000 implements MigrationInterface {
  name = 'CreateFinishedGoodsReceipts1762621200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "finished_goods_receipt_status_enum" AS ENUM ('posted', 'reversed')
    `);
    await queryRunner.query(`
      CREATE TABLE "finished_goods_receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "receipt_number" character varying(50) NOT NULL,
        "production_order_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "receipt_date" date NOT NULL,
        "quantity" numeric(18,6) NOT NULL,
        "unit_cost" numeric(18,6) NOT NULL,
        "total_cost" numeric(18,6) NOT NULL,
        "status" "finished_goods_receipt_status_enum" NOT NULL DEFAULT 'posted',
        "notes" text,
        "created_by" uuid,
        "reversed_at" TIMESTAMP WITH TIME ZONE,
        "reversed_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "chk_finished_goods_receipts_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "chk_finished_goods_receipts_unit_cost_non_negative" CHECK ("unit_cost" >= 0),
        CONSTRAINT "chk_finished_goods_receipts_total_cost_non_negative" CHECK ("total_cost" >= 0),
        CONSTRAINT "uq_finished_goods_receipts_company_number" UNIQUE ("company_id", "receipt_number"),
        CONSTRAINT "PK_finished_goods_receipts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_finished_goods_receipts_company_id" ON "finished_goods_receipts" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "idx_finished_goods_receipts_production_order_id" ON "finished_goods_receipts" ("production_order_id")`);
    await queryRunner.query(`CREATE INDEX "idx_finished_goods_receipts_item_id" ON "finished_goods_receipts" ("item_id")`);
    await queryRunner.query(`CREATE INDEX "idx_finished_goods_receipts_warehouse_id" ON "finished_goods_receipts" ("warehouse_id")`);
    await queryRunner.query(`ALTER TABLE "finished_goods_receipts" ADD CONSTRAINT "FK_finished_goods_receipts_production_order" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "finished_goods_receipts" ADD CONSTRAINT "FK_finished_goods_receipts_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "finished_goods_receipts" ADD CONSTRAINT "FK_finished_goods_receipts_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "finished_goods_receipts" DROP CONSTRAINT "FK_finished_goods_receipts_warehouse"`);
    await queryRunner.query(`ALTER TABLE "finished_goods_receipts" DROP CONSTRAINT "FK_finished_goods_receipts_item"`);
    await queryRunner.query(`ALTER TABLE "finished_goods_receipts" DROP CONSTRAINT "FK_finished_goods_receipts_production_order"`);
    await queryRunner.query(`DROP INDEX "public"."idx_finished_goods_receipts_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_finished_goods_receipts_item_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_finished_goods_receipts_production_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_finished_goods_receipts_company_id"`);
    await queryRunner.query(`DROP TABLE "finished_goods_receipts"`);
    await queryRunner.query(`DROP TYPE "finished_goods_receipt_status_enum"`);
  }
}
