import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionVariance1787613000000 implements MigrationInterface {
  name = 'CreateProductionVariance1787613000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "production_variance_status_enum" AS ENUM ('calculated', 'posted')`);
    await queryRunner.query(`
      CREATE TABLE "production_variance_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "favorable_variance_account_id" uuid NOT NULL,
        "unfavorable_variance_account_id" uuid NOT NULL,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_variance_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_production_variance_settings_company" UNIQUE ("company_id"),
        CONSTRAINT "FK_production_variance_settings_favorable" FOREIGN KEY ("favorable_variance_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_production_variance_settings_unfavorable" FOREIGN KEY ("unfavorable_variance_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "production_variances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "production_order_id" uuid NOT NULL,
        "variance_date" date NOT NULL,
        "material_cost" numeric(18,2) NOT NULL,
        "finished_goods_cost" numeric(18,2) NOT NULL,
        "wip_variance" numeric(18,2) NOT NULL,
        "status" "production_variance_status_enum" NOT NULL DEFAULT 'calculated',
        "journal_entry_id" uuid,
        "notes" text,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_production_variances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_production_variances_order" UNIQUE ("company_id", "production_order_id"),
        CONSTRAINT "CHK_production_variance_costs_non_negative" CHECK ("material_cost" >= 0 AND "finished_goods_cost" >= 0),
        CONSTRAINT "FK_production_variances_order" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_production_variances_journal" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "production_variance_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "production_variance_id" uuid NOT NULL,
        "production_order_component_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "required_quantity" numeric(18,6) NOT NULL,
        "consumed_quantity" numeric(18,6) NOT NULL,
        "quantity_variance" numeric(18,6) NOT NULL,
        "actual_cost" numeric(18,2) NOT NULL,
        CONSTRAINT "PK_production_variance_lines" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_production_variance_line_component" UNIQUE ("production_variance_id", "production_order_component_id"),
        CONSTRAINT "FK_production_variance_lines_variance" FOREIGN KEY ("production_variance_id") REFERENCES "production_variances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_production_variance_lines_component" FOREIGN KEY ("production_order_component_id") REFERENCES "production_order_components"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_production_variance_lines_item" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_production_variances_company" ON "production_variances" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_production_variances_status" ON "production_variances" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_production_variances_status"`);
    await queryRunner.query(`DROP INDEX "IDX_production_variances_company"`);
    await queryRunner.query(`DROP TABLE "production_variance_lines"`);
    await queryRunner.query(`DROP TABLE "production_variances"`);
    await queryRunner.query(`DROP TABLE "production_variance_settings"`);
    await queryRunner.query(`DROP TYPE "production_variance_status_enum"`);
  }
}
