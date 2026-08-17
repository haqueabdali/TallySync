import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateManufacturingWipAccounting1787612000000 implements MigrationInterface {
  name = 'CreateManufacturingWipAccounting1787612000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "manufacturing_wip_posting_type_enum" AS ENUM ('material_consumption', 'finished_goods_receipt')`);
    await queryRunner.query(`CREATE TABLE "manufacturing_wip_accounting_settings" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "company_id" uuid NOT NULL,
      "wip_account_id" uuid NOT NULL,
      "created_by" uuid,
      "updated_by" uuid,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_manufacturing_wip_accounting_settings" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_manufacturing_wip_accounting_settings_company" UNIQUE ("company_id"),
      CONSTRAINT "FK_manufacturing_wip_settings_account" FOREIGN KEY ("wip_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE TABLE "manufacturing_wip_postings" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "company_id" uuid NOT NULL,
      "production_order_id" uuid NOT NULL,
      "posting_type" "manufacturing_wip_posting_type_enum" NOT NULL,
      "source_id" uuid NOT NULL,
      "posting_date" date NOT NULL,
      "amount" numeric(18,2) NOT NULL,
      "journal_entry_id" uuid NOT NULL,
      "created_by" uuid,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_manufacturing_wip_postings" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_manufacturing_wip_postings_source" UNIQUE ("company_id", "posting_type", "source_id"),
      CONSTRAINT "FK_manufacturing_wip_postings_order" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_manufacturing_wip_postings_journal" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT,
      CONSTRAINT "CHK_manufacturing_wip_postings_amount" CHECK ("amount" > 0)
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_manufacturing_wip_postings_company" ON "manufacturing_wip_postings" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_manufacturing_wip_postings_order" ON "manufacturing_wip_postings" ("production_order_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "manufacturing_wip_postings"`);
    await queryRunner.query(`DROP TABLE "manufacturing_wip_accounting_settings"`);
    await queryRunner.query(`DROP TYPE "manufacturing_wip_posting_type_enum"`);
  }
}
