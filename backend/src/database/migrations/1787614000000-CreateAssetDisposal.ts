import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateAssetDisposal1787614000000 implements MigrationInterface {
  name = 'CreateAssetDisposal1787614000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "asset_disposals_status_enum" AS ENUM ('draft', 'posted')`);
    await queryRunner.query(`CREATE TABLE "asset_disposals" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "asset_id" uuid NOT NULL,
      "disposal_date" date NOT NULL, "disposal_proceeds" numeric(18,4) NOT NULL DEFAULT '0',
      "accumulated_depreciation" numeric(18,4) NOT NULL, "net_book_value" numeric(18,4) NOT NULL,
      "gain_amount" numeric(18,4) NOT NULL DEFAULT '0', "loss_amount" numeric(18,4) NOT NULL DEFAULT '0',
      "proceeds_account_id" uuid, "gain_account_id" uuid NOT NULL, "loss_account_id" uuid NOT NULL,
      "status" "asset_disposals_status_enum" NOT NULL DEFAULT 'draft', "journal_entry_id" uuid,
      "notes" text, "created_by" uuid NOT NULL, "posted_by" uuid, "posted_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_asset_disposals" PRIMARY KEY ("id"), CONSTRAINT "UQ_asset_disposals_asset" UNIQUE ("asset_id"),
      CONSTRAINT "FK_asset_disposals_asset" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_asset_disposals_company" ON "asset_disposals" ("company_id")`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_asset_disposals_company"`);
    await queryRunner.query(`DROP TABLE "asset_disposals"`);
    await queryRunner.query(`DROP TYPE "asset_disposals_status_enum"`);
  }
}
