import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVatEngine1762966800000 implements MigrationInterface {
  name = 'CreateVatEngine1762966800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "vat_return_status_enum" AS ENUM('draft','finalized')`);
    await queryRunner.query(`CREATE TYPE "vat_direction_enum" AS ENUM('output','input')`);
    await queryRunner.query(`CREATE TABLE "vat_returns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "status" "vat_return_status_enum" NOT NULL DEFAULT 'draft', "output_tax" numeric(18,2) NOT NULL DEFAULT 0, "input_tax" numeric(18,2) NOT NULL DEFAULT 0, "net_tax_payable" numeric(18,2) NOT NULL DEFAULT 0, "notes" text, "created_by" uuid, "finalized_by" uuid, "finalized_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_vat_returns" PRIMARY KEY ("id"), CONSTRAINT "UQ_vat_returns_company_period" UNIQUE ("company_id","period_start","period_end"))`);
    await queryRunner.query(`CREATE TABLE "vat_return_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vat_return_id" uuid NOT NULL, "direction" "vat_direction_enum" NOT NULL, "tax_percent" numeric(7,4) NOT NULL, "taxable_amount" numeric(18,2) NOT NULL DEFAULT 0, "tax_amount" numeric(18,2) NOT NULL DEFAULT 0, CONSTRAINT "PK_vat_return_lines" PRIMARY KEY ("id"), CONSTRAINT "UQ_vat_return_lines_return_direction_rate" UNIQUE ("vat_return_id","direction","tax_percent"), CONSTRAINT "FK_vat_return_lines_return" FOREIGN KEY ("vat_return_id") REFERENCES "vat_returns"("id") ON DELETE CASCADE)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vat_return_lines"`);
    await queryRunner.query(`DROP TABLE "vat_returns"`);
    await queryRunner.query(`DROP TYPE "vat_direction_enum"`);
    await queryRunner.query(`DROP TYPE "vat_return_status_enum"`);
  }
}
