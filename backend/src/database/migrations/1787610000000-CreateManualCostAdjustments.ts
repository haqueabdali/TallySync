import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateManualCostAdjustments1787610000000 implements MigrationInterface {
  name = 'CreateManualCostAdjustments1787610000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "manual_cost_adjustment_status_enum" AS ENUM ('draft','posted')`);
    await queryRunner.query(`CREATE TYPE "manual_cost_adjustment_type_enum" AS ENUM ('quantity_in','quantity_out','value_in','value_out')`);
    await queryRunner.query(`CREATE TABLE "manual_cost_adjustments" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "adjustment_number" varchar(40) NOT NULL,
      "adjustment_date" date NOT NULL, "status" "manual_cost_adjustment_status_enum" NOT NULL DEFAULT 'draft',
      "gain_account_id" uuid NOT NULL, "loss_account_id" uuid NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'EUR',
      "total_increase" numeric(18,4) NOT NULL DEFAULT 0, "total_decrease" numeric(18,4) NOT NULL DEFAULT 0,
      "journal_entry_id" uuid, "notes" text, "created_by" uuid NOT NULL, "posted_by" uuid, "posted_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_manual_cost_adjustments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_manual_cost_adjustments_company_number" UNIQUE ("company_id","adjustment_number")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_manual_cost_adjustments_company_date" ON "manual_cost_adjustments" ("company_id","adjustment_date")`);
    await queryRunner.query(`CREATE TABLE "manual_cost_adjustment_lines" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "adjustment_id" uuid NOT NULL, "item_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL,
      "adjustment_type" "manual_cost_adjustment_type_enum" NOT NULL, "quantity_change" numeric(18,4) NOT NULL DEFAULT 0,
      "value_change" numeric(18,4) NOT NULL, "unit_cost" numeric(18,6) NOT NULL, "old_quantity" numeric(18,4) NOT NULL,
      "new_quantity" numeric(18,4) NOT NULL, "old_value" numeric(18,4) NOT NULL, "new_value" numeric(18,4) NOT NULL,
      "old_average_unit_cost" numeric(18,6) NOT NULL, "new_average_unit_cost" numeric(18,6) NOT NULL, "reason" varchar(500),
      CONSTRAINT "PK_manual_cost_adjustment_lines" PRIMARY KEY ("id"),
      CONSTRAINT "FK_manual_cost_adjustment_lines_adjustment" FOREIGN KEY ("adjustment_id") REFERENCES "manual_cost_adjustments"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_manual_cost_adjustment_lines_adjustment" ON "manual_cost_adjustment_lines" ("adjustment_id")`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "manual_cost_adjustment_lines"`);
    await queryRunner.query(`DROP TABLE "manual_cost_adjustments"`);
    await queryRunner.query(`DROP TYPE "manual_cost_adjustment_type_enum"`);
    await queryRunner.query(`DROP TYPE "manual_cost_adjustment_status_enum"`);
  }
}
