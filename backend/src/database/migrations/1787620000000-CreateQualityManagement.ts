import type {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class CreateQualityManagement1787620000000
  implements MigrationInterface
{
  name =
    'CreateQualityManagement1787620000000';

  async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "quality_inspections_source_type_enum"
      AS ENUM (
        'production',
        'goods_receipt',
        'inventory',
        'manual'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "quality_inspections_status_enum"
      AS ENUM (
        'draft',
        'in_progress',
        'passed',
        'failed',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "quality_inspection_checks_result_enum"
      AS ENUM (
        'pending',
        'pass',
        'fail',
        'not_applicable'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quality_inspections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "inspection_number" varchar(50) NOT NULL,
        "inspection_date" date NOT NULL,
        "source_type" "quality_inspections_source_type_enum" NOT NULL,
        "source_id" uuid NULL,
        "item_id" uuid NULL,
        "warehouse_id" uuid NULL,
        "status" "quality_inspections_status_enum" NOT NULL DEFAULT 'draft',
        "inspected_quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "accepted_quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "rejected_quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "inspector_id" uuid NULL,
        "completed_at" timestamptz NULL,
        "failure_reason" text NULL,
        "notes" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_quality_inspections"
          PRIMARY KEY ("id"),
        CONSTRAINT "CHK_quality_inspections_inspected_quantity"
          CHECK ("inspected_quantity" >= 0),
        CONSTRAINT "CHK_quality_inspections_accepted_quantity"
          CHECK ("accepted_quantity" >= 0),
        CONSTRAINT "CHK_quality_inspections_rejected_quantity"
          CHECK ("rejected_quantity" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_quality_inspections_company_number"
      ON "quality_inspections" (
        "company_id",
        "inspection_number"
      )
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_quality_inspections_company_status"
      ON "quality_inspections" (
        "company_id",
        "status"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_quality_inspections_source"
      ON "quality_inspections" (
        "company_id",
        "source_type",
        "source_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_quality_inspections_date"
      ON "quality_inspections" (
        "company_id",
        "inspection_date"
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quality_inspection_checks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "inspection_id" uuid NOT NULL,
        "check_name" varchar(200) NOT NULL,
        "specification" varchar(1000) NULL,
        "minimum_value" numeric(18,6) NULL,
        "maximum_value" numeric(18,6) NULL,
        "actual_numeric_value" numeric(18,6) NULL,
        "expected_text" varchar(500) NULL,
        "actual_text" varchar(500) NULL,
        "result" "quality_inspection_checks_result_enum" NOT NULL DEFAULT 'pending',
        "is_mandatory" boolean NOT NULL DEFAULT true,
        "remarks" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quality_inspection_checks"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_quality_inspection_checks_inspection"
          FOREIGN KEY ("inspection_id")
          REFERENCES "quality_inspections"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_quality_inspection_checks_inspection"
      ON "quality_inspection_checks" (
        "inspection_id"
      )
    `);
  }

  async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS "quality_inspection_checks"',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "quality_inspections"',
    );
    await queryRunner.query(
      'DROP TYPE IF EXISTS "quality_inspection_checks_result_enum"',
    );
    await queryRunner.query(
      'DROP TYPE IF EXISTS "quality_inspections_status_enum"',
    );
    await queryRunner.query(
      'DROP TYPE IF EXISTS "quality_inspections_source_type_enum"',
    );
  }
}
