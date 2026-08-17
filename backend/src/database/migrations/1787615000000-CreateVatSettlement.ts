import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVatSettlement1787615000000 implements MigrationInterface {
  name = 'CreateVatSettlement1787615000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."vat_settlements_status_enum" AS ENUM('draft', 'posted')`);
    await queryRunner.query(`CREATE TABLE "vat_settlement_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "output_vat_account_id" uuid NOT NULL, "input_vat_account_id" uuid NOT NULL, "vat_payable_account_id" uuid NOT NULL, "vat_receivable_account_id" uuid NOT NULL, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_vat_settlement_settings_company" UNIQUE ("company_id"), CONSTRAINT "PK_vat_settlement_settings" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "vat_settlements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "vat_return_id" uuid NOT NULL, "settlement_date" date NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'EUR', "output_tax" numeric(18,2) NOT NULL, "input_tax" numeric(18,2) NOT NULL, "net_tax_payable" numeric(18,2) NOT NULL, "status" "public"."vat_settlements_status_enum" NOT NULL DEFAULT 'draft', "journal_entry_id" uuid, "notes" text, "created_by" uuid, "posted_by" uuid, "posted_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_vat_settlements_company_return" UNIQUE ("company_id", "vat_return_id"), CONSTRAINT "PK_vat_settlements" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_vat_settlements_company_date" ON "vat_settlements" ("company_id", "settlement_date")`);
    await queryRunner.query(`ALTER TABLE "vat_settlements" ADD CONSTRAINT "FK_vat_settlements_return" FOREIGN KEY ("vat_return_id") REFERENCES "vat_returns"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vat_settlements" DROP CONSTRAINT "FK_vat_settlements_return"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vat_settlements_company_date"`);
    await queryRunner.query(`DROP TABLE "vat_settlements"`);
    await queryRunner.query(`DROP TABLE "vat_settlement_settings"`);
    await queryRunner.query(`DROP TYPE "public"."vat_settlements_status_enum"`);
  }
}
