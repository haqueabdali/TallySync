import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionOrders1787601000000 implements MigrationInterface {
  name = 'CreateProductionOrders1787601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "production_order_status_enum" AS ENUM ('draft', 'released', 'in_progress', 'completed', 'cancelled')`);
    await queryRunner.query(`
      CREATE TABLE "production_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "order_number" character varying(50) NOT NULL,
        "bill_of_material_id" uuid NOT NULL,
        "finished_item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "status" "production_order_status_enum" NOT NULL DEFAULT 'draft',
        "planned_quantity" numeric(18,6) NOT NULL,
        "completed_quantity" numeric(18,6) NOT NULL DEFAULT 0,
        "planned_start_date" date,
        "planned_end_date" date,
        "actual_start_date" TIMESTAMP WITH TIME ZONE,
        "actual_end_date" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "chk_production_orders_planned_quantity_positive" CHECK ("planned_quantity" > 0),
        CONSTRAINT "chk_production_orders_completed_quantity_non_negative" CHECK ("completed_quantity" >= 0),
        CONSTRAINT "PK_production_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_production_orders_bom" FOREIGN KEY ("bill_of_material_id") REFERENCES "bills_of_material"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_production_orders_finished_item" FOREIGN KEY ("finished_item_id") REFERENCES "items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_production_orders_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_production_orders_company_id" ON "production_orders" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "idx_production_orders_bom_id" ON "production_orders" ("bill_of_material_id")`);
    await queryRunner.query(`CREATE INDEX "idx_production_orders_finished_item_id" ON "production_orders" ("finished_item_id")`);
    await queryRunner.query(`CREATE INDEX "idx_production_orders_warehouse_id" ON "production_orders" ("warehouse_id")`);
    await queryRunner.query(`CREATE INDEX "idx_production_orders_status" ON "production_orders" ("status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_production_orders_company_number" ON "production_orders" ("company_id", "order_number") WHERE "deleted_at" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "production_order_components" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "production_order_id" uuid NOT NULL,
        "component_item_id" uuid NOT NULL,
        "bom_quantity" numeric(18,6) NOT NULL,
        "scrap_percentage" numeric(7,4) NOT NULL DEFAULT 0,
        "required_quantity" numeric(18,6) NOT NULL,
        "consumed_quantity" numeric(18,6) NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "chk_production_order_component_required_positive" CHECK ("required_quantity" > 0),
        CONSTRAINT "chk_production_order_component_consumed_non_negative" CHECK ("consumed_quantity" >= 0),
        CONSTRAINT "PK_production_order_components" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_production_order_component_item" UNIQUE ("production_order_id", "component_item_id"),
        CONSTRAINT "FK_production_order_components_order" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_production_order_components_item" FOREIGN KEY ("component_item_id") REFERENCES "items"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_production_order_components_order_id" ON "production_order_components" ("production_order_id")`);
    await queryRunner.query(`CREATE INDEX "idx_production_order_components_item_id" ON "production_order_components" ("component_item_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "production_order_components"`);
    await queryRunner.query(`DROP TABLE "production_orders"`);
    await queryRunner.query(`DROP TYPE "production_order_status_enum"`);
  }
}
