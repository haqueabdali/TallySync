import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateDepreciation1787605000000 implements MigrationInterface {
  name = 'CreateDepreciation1787605000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."depreciation_runs_status_enum" AS ENUM('draft','posted')`);
    await queryRunner.query(`CREATE TABLE "depreciation_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "period_end" date NOT NULL, "posting_date" date NOT NULL, "status" "public"."depreciation_runs_status_enum" NOT NULL DEFAULT 'draft', "total_amount" numeric(18,2) NOT NULL DEFAULT 0, "journal_entry_id" uuid, "created_by" uuid NOT NULL, "posted_by" uuid, "posted_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_depreciation_runs" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_depreciation_runs_company_period" ON "depreciation_runs" ("company_id", "period_end")`);
    await queryRunner.query(`CREATE INDEX "IDX_depreciation_runs_company_status" ON "depreciation_runs" ("company_id", "status")`);
    await queryRunner.query(`ALTER TABLE "depreciation_runs" ADD CONSTRAINT "FK_depreciation_runs_journal" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE TABLE "depreciation_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "run_id" uuid NOT NULL, "asset_id" uuid NOT NULL, "months_depreciated" integer NOT NULL, "opening_accumulated_depreciation" numeric(18,2) NOT NULL, "depreciation_amount" numeric(18,2) NOT NULL, "closing_accumulated_depreciation" numeric(18,2) NOT NULL, "opening_net_book_value" numeric(18,2) NOT NULL, "closing_net_book_value" numeric(18,2) NOT NULL, "expense_account_id" uuid NOT NULL, "accumulated_depreciation_account_id" uuid NOT NULL, CONSTRAINT "CHK_depreciation_entry_amounts" CHECK ("months_depreciated" > 0 AND "depreciation_amount" > 0), CONSTRAINT "PK_depreciation_entries" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_depreciation_entries_run_asset" ON "depreciation_entries" ("run_id", "asset_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_depreciation_entries_asset" ON "depreciation_entries" ("company_id", "asset_id")`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" ADD CONSTRAINT "FK_depreciation_entries_run" FOREIGN KEY ("run_id") REFERENCES "depreciation_runs"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" ADD CONSTRAINT "FK_depreciation_entries_asset" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" ADD CONSTRAINT "FK_depreciation_entries_expense_account" FOREIGN KEY ("expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" ADD CONSTRAINT "FK_depreciation_entries_accumulated_account" FOREIGN KEY ("accumulated_depreciation_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "depreciation_entries" DROP CONSTRAINT "FK_depreciation_entries_accumulated_account"`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" DROP CONSTRAINT "FK_depreciation_entries_expense_account"`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" DROP CONSTRAINT "FK_depreciation_entries_asset"`);
    await queryRunner.query(`ALTER TABLE "depreciation_entries" DROP CONSTRAINT "FK_depreciation_entries_run"`);
    await queryRunner.query(`DROP TABLE "depreciation_entries"`);
    await queryRunner.query(`ALTER TABLE "depreciation_runs" DROP CONSTRAINT "FK_depreciation_runs_journal"`);
    await queryRunner.query(`DROP TABLE "depreciation_runs"`);
    await queryRunner.query(`DROP TYPE "public"."depreciation_runs_status_enum"`);
  }
}
