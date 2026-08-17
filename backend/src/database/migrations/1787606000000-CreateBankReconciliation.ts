import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateBankReconciliation1787606000000 implements MigrationInterface {
  name = 'CreateBankReconciliation1787606000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."bank_reconciliations_status_enum" AS ENUM('draft','in_progress','reconciled','cancelled')`);
    await queryRunner.query(`CREATE TYPE "public"."bank_statement_lines_status_enum" AS ENUM('unmatched','partially_matched','matched')`);
    await queryRunner.query(`CREATE TABLE "bank_reconciliations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "bank_account_id" uuid NOT NULL, "statement_reference" character varying(120) NOT NULL, "statement_start_date" date NOT NULL, "statement_end_date" date NOT NULL, "opening_balance" numeric(18,2) NOT NULL, "closing_balance" numeric(18,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'EUR', "status" "public"."bank_reconciliations_status_enum" NOT NULL DEFAULT 'draft', "notes" text, "created_by" uuid, "reconciled_by" uuid, "reconciled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_bank_reconciliations" PRIMARY KEY ("id"), CONSTRAINT "FK_bank_reconciliations_account" FOREIGN KEY ("bank_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_bank_reconciliations_company_reference" ON "bank_reconciliations" ("company_id","statement_reference") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_bank_reconciliations_company" ON "bank_reconciliations" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_bank_reconciliations_account_period" ON "bank_reconciliations" ("company_id","bank_account_id","statement_start_date","statement_end_date")`);
    await queryRunner.query(`CREATE TABLE "bank_statement_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reconciliation_id" uuid NOT NULL, "transaction_date" date NOT NULL, "value_date" date, "external_transaction_id" character varying(160), "reference" character varying(160), "description" text, "amount" numeric(18,2) NOT NULL, "matched_amount" numeric(18,2) NOT NULL DEFAULT 0, "status" "public"."bank_statement_lines_status_enum" NOT NULL DEFAULT 'unmatched', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bank_statement_lines" PRIMARY KEY ("id"), CONSTRAINT "FK_bank_statement_lines_reconciliation" FOREIGN KEY ("reconciliation_id") REFERENCES "bank_reconciliations"("id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE INDEX "IDX_bank_statement_lines_reconciliation" ON "bank_statement_lines" ("reconciliation_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_bank_statement_lines_date" ON "bank_statement_lines" ("transaction_date")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_bank_statement_lines_external" ON "bank_statement_lines" ("reconciliation_id","external_transaction_id") WHERE "external_transaction_id" IS NOT NULL`);
    await queryRunner.query(`CREATE TABLE "bank_reconciliation_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "statement_line_id" uuid NOT NULL, "journal_entry_line_id" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bank_reconciliation_matches" PRIMARY KEY ("id"), CONSTRAINT "UQ_bank_reconciliation_matches_pair" UNIQUE ("statement_line_id","journal_entry_line_id"), CONSTRAINT "FK_bank_matches_statement_line" FOREIGN KEY ("statement_line_id") REFERENCES "bank_statement_lines"("id") ON DELETE CASCADE, CONSTRAINT "FK_bank_matches_journal_line" FOREIGN KEY ("journal_entry_line_id") REFERENCES "journal_entry_lines"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE INDEX "IDX_bank_reconciliation_matches_statement_line" ON "bank_reconciliation_matches" ("statement_line_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_bank_reconciliation_matches_journal_line" ON "bank_reconciliation_matches" ("journal_entry_line_id")`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bank_reconciliation_matches"`);
    await queryRunner.query(`DROP TABLE "bank_statement_lines"`);
    await queryRunner.query(`DROP TABLE "bank_reconciliations"`);
    await queryRunner.query(`DROP TYPE "public"."bank_statement_lines_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."bank_reconciliations_status_enum"`);
  }
}
