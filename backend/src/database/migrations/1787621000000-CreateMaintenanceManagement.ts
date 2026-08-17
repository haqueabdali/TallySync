import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaintenanceManagement1787621000000
  implements MigrationInterface
{
  name = 'CreateMaintenanceManagement1787621000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "maintenance_assets_status_enum"
      AS ENUM ('active','inactive','out_of_service','retired')
    `);

    await queryRunner.query(`
      CREATE TYPE "maintenance_plans_frequency_enum"
      AS ENUM ('daily','weekly','monthly','quarterly','semi_annual','annual')
    `);

    await queryRunner.query(`
      CREATE TYPE "maintenance_work_orders_type_enum"
      AS ENUM ('preventive','corrective','inspection','emergency')
    `);

    await queryRunner.query(`
      CREATE TYPE "maintenance_work_orders_status_enum"
      AS ENUM ('open','scheduled','in_progress','completed','cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "maintenance_assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "asset_code" varchar(100) NOT NULL,
        "asset_name" varchar(200) NOT NULL,
        "category" varchar(100) NULL,
        "manufacturer" varchar(200) NULL,
        "model" varchar(200) NULL,
        "serial_number" varchar(200) NULL,
        "location" varchar(200) NULL,
        "status" "maintenance_assets_status_enum" NOT NULL DEFAULT 'active',
        "commissioned_date" date NULL,
        "last_maintenance_date" date NULL,
        "next_maintenance_date" date NULL,
        "notes" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_maintenance_assets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_maintenance_assets_company_code"
      ON "maintenance_assets" ("company_id","asset_code")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_assets_company_status"
      ON "maintenance_assets" ("company_id","status")
    `);

    await queryRunner.query(`
      CREATE TABLE "maintenance_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "asset_id" uuid NOT NULL,
        "plan_name" varchar(200) NOT NULL,
        "frequency" "maintenance_plans_frequency_enum" NOT NULL,
        "start_date" date NOT NULL,
        "next_due_date" date NOT NULL,
        "estimated_minutes" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "instructions" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_maintenance_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_maintenance_plans_asset"
          FOREIGN KEY ("asset_id")
          REFERENCES "maintenance_assets"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_plans_company_asset"
      ON "maintenance_plans" ("company_id","asset_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_plans_due"
      ON "maintenance_plans" ("company_id","next_due_date")
    `);

    await queryRunner.query(`
      CREATE TABLE "maintenance_work_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "asset_id" uuid NOT NULL,
        "maintenance_plan_id" uuid NULL,
        "work_order_number" varchar(50) NOT NULL,
        "type" "maintenance_work_orders_type_enum" NOT NULL,
        "status" "maintenance_work_orders_status_enum" NOT NULL DEFAULT 'open',
        "scheduled_start_at" timestamptz NULL,
        "scheduled_end_at" timestamptz NULL,
        "actual_start_at" timestamptz NULL,
        "actual_end_at" timestamptz NULL,
        "assigned_to" uuid NULL,
        "description" text NOT NULL,
        "resolution_notes" text NULL,
        "labor_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "parts_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_work_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_maintenance_work_orders_asset"
          FOREIGN KEY ("asset_id")
          REFERENCES "maintenance_assets"("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_maintenance_work_orders_company_number"
      ON "maintenance_work_orders" ("company_id","work_order_number")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_work_orders_company_status"
      ON "maintenance_work_orders" ("company_id","status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_work_orders_asset"
      ON "maintenance_work_orders" ("company_id","asset_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "maintenance_downtime_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "asset_id" uuid NOT NULL,
        "work_order_id" uuid NULL,
        "started_at" timestamptz NOT NULL,
        "ended_at" timestamptz NULL,
        "reason" varchar(500) NOT NULL,
        "notes" text NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_downtime_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_maintenance_downtime_asset"
          FOREIGN KEY ("asset_id")
          REFERENCES "maintenance_assets"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_downtime_company_asset"
      ON "maintenance_downtime_logs" ("company_id","asset_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_maintenance_downtime_period"
      ON "maintenance_downtime_logs" ("company_id","started_at","ended_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "maintenance_downtime_logs"');
    await queryRunner.query('DROP TABLE IF EXISTS "maintenance_work_orders"');
    await queryRunner.query('DROP TABLE IF EXISTS "maintenance_plans"');
    await queryRunner.query('DROP TABLE IF EXISTS "maintenance_assets"');

    await queryRunner.query('DROP TYPE IF EXISTS "maintenance_work_orders_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "maintenance_work_orders_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "maintenance_plans_frequency_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "maintenance_assets_status_enum"');
  }
}
