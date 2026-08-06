import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterialConsumptions1762534800000 implements MigrationInterface {
  name = 'CreateMaterialConsumptions1762534800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "material_consumption_status_enum" AS ENUM ('posted', 'reversed')`);
    await queryRunner.query(`
      CREATE TABLE "material_consumptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "consumption_number" character varying(50) NOT NULL,
        "production_order_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "consumption_date" date NOT NULL,
        "status" "material_consumption_status_enum" NOT NULL DEFAULT 'posted',
        "notes" text,
        "created_by" uuid,
        "reversed_at" TIMESTAMP WITH TIME ZONE,
        "reversed_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_material_consumptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_material_consumptions_company_number" UNIQUE ("company_id", "consumption_number"),
        CONSTRAINT "FK_material_consumptions_production_order" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_material_consumptions_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_material_consumptions_company_id" ON "material_consumptions" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "idx_material_consumptions_production_order_id" ON "material_consumptions" ("production_order_id")`);
    await queryRunner.query(`CREATE INDEX "idx_material_consumptions_warehouse_id" ON "material_consumptions" ("warehouse_id")`);

    await queryRunner.query(`
      CREATE TABLE "material_consumption_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "consumption_id" uuid NOT NULL,
        "production_order_component_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,6) NOT NULL,
        "unit_cost" numeric(18,6) NOT NULL,
        "total_cost" numeric(18,6) NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_material_consumption_lines" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_material_consumption_component" UNIQUE ("consumption_id", "production_order_component_id"),
        CONSTRAINT "CHK_material_consumption_line_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_material_consumption_line_cost_non_negative" CHECK ("unit_cost" >= 0 AND "total_cost" >= 0),
        CONSTRAINT "FK_material_consumption_lines_consumption" FOREIGN KEY ("consumption_id") REFERENCES "material_consumptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_material_consumption_lines_component" FOREIGN KEY ("production_order_component_id") REFERENCES "production_order_components"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_material_consumption_lines_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_material_consumption_lines_consumption_id" ON "material_consumption_lines" ("consumption_id")`);
    await queryRunner.query(`CREATE INDEX "idx_material_consumption_lines_component_id" ON "material_consumption_lines" ("production_order_component_id")`);
    await queryRunner.query(`CREATE INDEX "idx_material_consumption_lines_item_id" ON "material_consumption_lines" ("item_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "material_consumption_lines"`);
    await queryRunner.query(`DROP TABLE "material_consumptions"`);
    await queryRunner.query(`DROP TYPE "material_consumption_status_enum"`);
  }
}
