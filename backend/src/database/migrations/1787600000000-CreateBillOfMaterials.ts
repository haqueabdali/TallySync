import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBillOfMaterials1787600000000 implements MigrationInterface {
  name = 'CreateBillOfMaterials1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "bill_of_material_status_enum" AS ENUM ('draft', 'active', 'inactive')`);
    await queryRunner.query(`
      CREATE TABLE "bills_of_material" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "finished_item_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "output_quantity" numeric(18,6) NOT NULL,
        "status" "bill_of_material_status_enum" NOT NULL DEFAULT 'draft',
        "effective_from" date,
        "effective_to" date,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "chk_bom_output_quantity_positive" CHECK ("output_quantity" > 0),
        CONSTRAINT "chk_bom_version_positive" CHECK ("version" > 0),
        CONSTRAINT "PK_bills_of_material" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bom_finished_item" FOREIGN KEY ("finished_item_id") REFERENCES "items"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_bom_company_id" ON "bills_of_material" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "idx_bom_finished_item_id" ON "bills_of_material" ("finished_item_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_bom_company_code" ON "bills_of_material" ("company_id", "code") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_bom_active_finished_item" ON "bills_of_material" ("company_id", "finished_item_id") WHERE "status" = 'active' AND "deleted_at" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "bill_of_material_components" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "bill_of_material_id" uuid NOT NULL,
        "component_item_id" uuid NOT NULL,
        "quantity" numeric(18,6) NOT NULL,
        "scrap_percentage" numeric(7,4) NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "chk_bom_component_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "chk_bom_component_scrap_percentage_range" CHECK ("scrap_percentage" >= 0 AND "scrap_percentage" <= 100),
        CONSTRAINT "uq_bom_component_item" UNIQUE ("bill_of_material_id", "component_item_id"),
        CONSTRAINT "PK_bill_of_material_components" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bom_component_bom" FOREIGN KEY ("bill_of_material_id") REFERENCES "bills_of_material"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bom_component_item" FOREIGN KEY ("component_item_id") REFERENCES "items"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_bom_component_bom_id" ON "bill_of_material_components" ("bill_of_material_id")`);
    await queryRunner.query(`CREATE INDEX "idx_bom_component_item_id" ON "bill_of_material_components" ("component_item_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bill_of_material_components"`);
    await queryRunner.query(`DROP TABLE "bills_of_material"`);
    await queryRunner.query(`DROP TYPE "bill_of_material_status_enum"`);
  }
}
