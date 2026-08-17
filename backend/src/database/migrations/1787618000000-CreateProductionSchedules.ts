import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionSchedules1787618000000
  implements MigrationInterface
{
  name = 'CreateProductionSchedules1787618000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "production_schedules_status_enum"
      AS ENUM ('planned','scheduled','in_progress','completed','cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "production_schedules_priority_enum"
      AS ENUM ('low','normal','high','urgent')
    `);
    await queryRunner.query(`
      CREATE TABLE "production_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "production_order_id" uuid NOT NULL,
        "schedule_number" varchar(50) NOT NULL,
        "planned_start_at" timestamptz NOT NULL,
        "planned_end_at" timestamptz NOT NULL,
        "actual_start_at" timestamptz NULL,
        "actual_end_at" timestamptz NULL,
        "status" "production_schedules_status_enum" NOT NULL DEFAULT 'planned',
        "priority" "production_schedules_priority_enum" NOT NULL DEFAULT 'normal',
        "work_center_code" varchar(100) NULL,
        "notes" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_production_schedules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_production_schedules_company"
      ON "production_schedules" ("company_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_production_schedules_order"
      ON "production_schedules" ("company_id","production_order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_production_schedules_window"
      ON "production_schedules" ("company_id","planned_start_at","planned_end_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_production_schedules_status"
      ON "production_schedules" ("company_id","status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_production_schedules_company_number"
      ON "production_schedules" ("company_id","schedule_number")
      WHERE "deleted_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_production_schedules_company_number"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_production_schedules_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_production_schedules_window"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_production_schedules_order"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_production_schedules_company"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "production_schedules"');
    await queryRunner.query(
      'DROP TYPE IF EXISTS "production_schedules_priority_enum"',
    );
    await queryRunner.query(
      'DROP TYPE IF EXISTS "production_schedules_status_enum"',
    );
  }
}
