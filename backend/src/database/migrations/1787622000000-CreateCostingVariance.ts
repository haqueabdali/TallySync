import type {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class CreateCostingVariance1787622000000
  implements MigrationInterface
{
  name =
    'CreateCostingVariance1787622000000';

  async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "production_cost_analyses_status_enum"
      AS ENUM (
        'draft',
        'finalized',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "production_cost_analyses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "production_reference_id" uuid NOT NULL,
        "analysis_number" varchar(50) NOT NULL,
        "analysis_date" date NOT NULL,
        "finished_item_id" uuid NULL,
        "planned_output_quantity" numeric(18,4) NOT NULL,
        "actual_output_quantity" numeric(18,4) NOT NULL,
        "standard_conversion_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "actual_conversion_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "standard_overhead_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "actual_overhead_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "revenue_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "status" "production_cost_analyses_status_enum"
          NOT NULL DEFAULT 'draft',
        "finalized_at" timestamptz NULL,
        "notes" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_production_cost_analyses"
          PRIMARY KEY ("id"),
        CONSTRAINT "CHK_production_cost_planned_output"
          CHECK ("planned_output_quantity" > 0),
        CONSTRAINT "CHK_production_cost_actual_output"
          CHECK ("actual_output_quantity" >= 0),
        CONSTRAINT "CHK_production_cost_conversion"
          CHECK (
            "standard_conversion_cost" >= 0
            AND "actual_conversion_cost" >= 0
          ),
        CONSTRAINT "CHK_production_cost_overhead"
          CHECK (
            "standard_overhead_cost" >= 0
            AND "actual_overhead_cost" >= 0
          ),
        CONSTRAINT "CHK_production_cost_revenue"
          CHECK ("revenue_amount" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
        "UQ_production_cost_analyses_company_reference"
      ON "production_cost_analyses" (
        "company_id",
        "production_reference_id"
      )
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX
        "UQ_production_cost_analyses_company_number"
      ON "production_cost_analyses" (
        "company_id",
        "analysis_number"
      )
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX
        "IDX_production_cost_analyses_company_status"
      ON "production_cost_analyses" (
        "company_id",
        "status"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX
        "IDX_production_cost_analyses_date"
      ON "production_cost_analyses" (
        "company_id",
        "analysis_date"
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "production_cost_material_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "analysis_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "standard_quantity" numeric(18,4) NOT NULL,
        "actual_quantity" numeric(18,4) NOT NULL,
        "standard_unit_cost" numeric(18,6) NOT NULL,
        "actual_unit_cost" numeric(18,6) NOT NULL,
        "description" varchar(500) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_cost_material_lines"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_production_cost_material_lines_analysis"
          FOREIGN KEY ("analysis_id")
          REFERENCES "production_cost_analyses"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_production_cost_material_quantities"
          CHECK (
            "standard_quantity" >= 0
            AND "actual_quantity" >= 0
          ),
        CONSTRAINT "CHK_production_cost_material_costs"
          CHECK (
            "standard_unit_cost" >= 0
            AND "actual_unit_cost" >= 0
          ),
        CONSTRAINT
          "UQ_production_cost_material_analysis_item"
          UNIQUE ("analysis_id","item_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX
        "IDX_production_cost_material_lines_analysis"
      ON "production_cost_material_lines" (
        "analysis_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX
        "IDX_production_cost_material_lines_item"
      ON "production_cost_material_lines" (
        "item_id"
      )
    `);
  }

  async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS "production_cost_material_lines"',
    );

    await queryRunner.query(
      'DROP TABLE IF EXISTS "production_cost_analyses"',
    );

    await queryRunner.query(
      'DROP TYPE IF EXISTS "production_cost_analyses_status_enum"',
    );
  }
}
