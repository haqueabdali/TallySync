import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashFlow1763053200000 implements MigrationInterface {
  name = 'CreateCashFlow1763053200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "cash_flow_account_mappings_activity_enum" AS ENUM('cash', 'operating', 'investing', 'financing')`,
    );
    await queryRunner.query(`
      CREATE TABLE "cash_flow_account_mappings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "activity" "cash_flow_account_mappings_activity_enum" NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "description" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cash_flow_account_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cash_flow_mapping_company_account" UNIQUE ("company_id", "account_id"),
        CONSTRAINT "FK_cash_flow_mapping_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cash_flow_mapping_company_activity" ON "cash_flow_account_mappings" ("company_id", "activity")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cash_flow_mapping_company_activity"`,
    );
    await queryRunner.query(`DROP TABLE "cash_flow_account_mappings"`);
    await queryRunner.query(
      `DROP TYPE "cash_flow_account_mappings_activity_enum"`,
    );
  }
}
