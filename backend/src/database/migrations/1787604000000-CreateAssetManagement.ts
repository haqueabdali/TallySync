import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateAssetManagement1787604000000 implements MigrationInterface {
  name = 'CreateAssetManagement1787604000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."asset_categories_depreciation_method_enum" AS ENUM('straight_line','declining_balance')`);
    await queryRunner.query(`CREATE TYPE "public"."fixed_assets_status_enum" AS ENUM('draft','active','fully_depreciated','disposed','inactive')`);
    await queryRunner.query(`CREATE TABLE "asset_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "code" character varying(30) NOT NULL, "name" character varying(150) NOT NULL, "description" text, "asset_account_id" uuid NOT NULL, "accumulated_depreciation_account_id" uuid NOT NULL, "depreciation_expense_account_id" uuid NOT NULL, "depreciation_method" "public"."asset_categories_depreciation_method_enum" NOT NULL DEFAULT 'straight_line', "default_useful_life_months" integer NOT NULL, "declining_balance_rate" numeric(7,4), "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_asset_category_life" CHECK ("default_useful_life_months" > 0), CONSTRAINT "PK_asset_categories" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_asset_categories_company" ON "asset_categories" ("company_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_asset_categories_company_code" ON "asset_categories" ("company_id", "code") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`ALTER TABLE "asset_categories" ADD CONSTRAINT "FK_asset_category_asset_account" FOREIGN KEY ("asset_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "asset_categories" ADD CONSTRAINT "FK_asset_category_accumulated_account" FOREIGN KEY ("accumulated_depreciation_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE "asset_categories" ADD CONSTRAINT "FK_asset_category_expense_account" FOREIGN KEY ("depreciation_expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE TABLE "fixed_assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "asset_number" character varying(40) NOT NULL, "name" character varying(180) NOT NULL, "description" text, "category_id" uuid NOT NULL, "acquisition_date" date NOT NULL, "depreciation_start_date" date NOT NULL, "acquisition_cost" numeric(18,4) NOT NULL, "residual_value" numeric(18,4) NOT NULL DEFAULT 0, "useful_life_months" integer NOT NULL, "serial_number" character varying(100), "location" character varying(180), "custodian" character varying(180), "status" "public"."fixed_assets_status_enum" NOT NULL DEFAULT 'draft', "activation_date" date, "disposal_date" date, "disposal_proceeds" numeric(18,4), "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_fixed_asset_values" CHECK ("acquisition_cost" >= 0 AND "residual_value" >= 0 AND "residual_value" <= "acquisition_cost" AND "useful_life_months" > 0), CONSTRAINT "PK_fixed_assets" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_fixed_assets_company" ON "fixed_assets" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_fixed_assets_category" ON "fixed_assets" ("category_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_fixed_assets_status" ON "fixed_assets" ("company_id", "status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_fixed_assets_company_number" ON "fixed_assets" ("company_id", "asset_number") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`ALTER TABLE "fixed_assets" ADD CONSTRAINT "FK_fixed_assets_category" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fixed_assets" DROP CONSTRAINT "FK_fixed_assets_category"`);
    await queryRunner.query(`DROP TABLE "fixed_assets"`);
    await queryRunner.query(`ALTER TABLE "asset_categories" DROP CONSTRAINT "FK_asset_category_expense_account"`);
    await queryRunner.query(`ALTER TABLE "asset_categories" DROP CONSTRAINT "FK_asset_category_accumulated_account"`);
    await queryRunner.query(`ALTER TABLE "asset_categories" DROP CONSTRAINT "FK_asset_category_asset_account"`);
    await queryRunner.query(`DROP TABLE "asset_categories"`);
    await queryRunner.query(`DROP TYPE "public"."fixed_assets_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."asset_categories_depreciation_method_enum"`);
  }
}
