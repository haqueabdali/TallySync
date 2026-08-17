import type {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class CreateCapacityPlanning1787619000000
  implements MigrationInterface
{
  name = 'CreateCapacityPlanning1787619000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "work_centers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "code" varchar(100) NOT NULL,
        "name" varchar(200) NOT NULL,
        "daily_capacity_minutes" integer NOT NULL,
        "efficiency_percent" numeric(7,2) NOT NULL DEFAULT 100,
        "working_days" jsonb NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_work_centers" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_work_centers_daily_capacity"
          CHECK ("daily_capacity_minutes" > 0 AND "daily_capacity_minutes" <= 1440),
        CONSTRAINT "CHK_work_centers_efficiency"
          CHECK ("efficiency_percent" > 0 AND "efficiency_percent" <= 200)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_work_centers_company_code"
      ON "work_centers" ("company_id","code")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_centers_company_active"
      ON "work_centers" ("company_id","is_active")
    `);

    await queryRunner.query(`
      CREATE TABLE "work_center_capacity_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "work_center_id" uuid NOT NULL,
        "capacity_date" date NOT NULL,
        "available_minutes" integer NOT NULL,
        "reason" varchar(500) NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_center_capacity_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_center_capacity_overrides_center"
          FOREIGN KEY ("work_center_id")
          REFERENCES "work_centers"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_work_center_capacity_override_minutes"
          CHECK ("available_minutes" >= 0 AND "available_minutes" <= 1440),
        CONSTRAINT "UQ_work_center_capacity_overrides_date"
          UNIQUE ("company_id","work_center_id","capacity_date")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_center_capacity_overrides_company_date"
      ON "work_center_capacity_overrides" ("company_id","capacity_date")
    `);
  }

  async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS "work_center_capacity_overrides"',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "work_centers"',
    );
  }
}
