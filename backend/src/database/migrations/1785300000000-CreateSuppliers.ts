import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliers1785300000000 implements MigrationInterface {
  name = 'CreateSuppliers1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "contact_person" varchar(255),
        "email" varchar(255),
        "phone" varchar(32),
        "address" text,
        "tax_number" varchar(100),
        "payment_terms_days" integer NOT NULL DEFAULT 0,
        "opening_balance" numeric(15,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_suppliers_company_name" ON "suppliers" ("company_id", "name")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_suppliers_company_tax_number" ON "suppliers" ("company_id", "tax_number") WHERE "tax_number" IS NOT NULL AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}
