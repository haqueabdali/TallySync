import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplierPayments1787400000000
  implements MigrationInterface
{
  name = 'CreateSupplierPayments1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'supplier_payments_status_enum'
        ) THEN
          CREATE TYPE "public"."supplier_payments_status_enum"
          AS ENUM ('Draft', 'Posted', 'Cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'supplier_payments_payment_method_enum'
        ) THEN
          CREATE TYPE "public"."supplier_payments_payment_method_enum"
          AS ENUM ('Cash','BankTransfer','Cheque','Card','Other');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "payment_number" character varying(50) NOT NULL,
        "payment_date" date NOT NULL,
        "payment_method" "public"."supplier_payments_payment_method_enum"
          NOT NULL DEFAULT 'BankTransfer',
        "status" "public"."supplier_payments_status_enum"
          NOT NULL DEFAULT 'Draft',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "amount" numeric(18,2) NOT NULL,
        "allocated_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "unallocated_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "reference_number" character varying(120),
        "bank_account_name" character varying(150),
        "cheque_number" character varying(100),
        "cheque_date" date,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "posted_by" uuid,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_by" uuid,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_supplier_payments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_supplier_payments_amount" CHECK ("amount" > 0),
        CONSTRAINT "CHK_supplier_payments_allocated" CHECK ("allocated_amount" >= 0),
        CONSTRAINT "CHK_supplier_payments_unallocated" CHECK ("unallocated_amount" >= 0),
        CONSTRAINT "CHK_supplier_payments_totals"
          CHECK ("allocated_amount" + "unallocated_amount" = "amount")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier_payment_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_payment_id" uuid NOT NULL,
        "purchase_invoice_id" uuid NOT NULL,
        "allocated_amount" numeric(18,2) NOT NULL,
        "invoice_balance_before" numeric(18,2) NOT NULL DEFAULT 0,
        "invoice_balance_after" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_supplier_payment_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_supplier_payment_allocations_amount" CHECK ("allocated_amount" > 0),
        CONSTRAINT "CHK_supplier_payment_allocations_before" CHECK ("invoice_balance_before" >= 0),
        CONSTRAINT "CHK_supplier_payment_allocations_after" CHECK ("invoice_balance_after" >= 0)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_company" ON "supplier_payments" ("company_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_supplier" ON "supplier_payments" ("supplier_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_status" ON "supplier_payments" ("company_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_date" ON "supplier_payments" ("company_id", "payment_date")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_supplier_payments_company_number" ON "supplier_payments" ("company_id", "payment_number") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_payment_allocations_payment" ON "supplier_payment_allocations" ("supplier_payment_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_supplier_payment_allocations_invoice" ON "supplier_payment_allocations" ("purchase_invoice_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_supplier_payment_allocation_payment_invoice" ON "supplier_payment_allocations" ("supplier_payment_id", "purchase_invoice_id")`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_supplier_payments_supplier') THEN
          ALTER TABLE "supplier_payments"
          ADD CONSTRAINT "FK_supplier_payments_supplier"
          FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_supplier_payment_allocations_payment') THEN
          ALTER TABLE "supplier_payment_allocations"
          ADD CONSTRAINT "FK_supplier_payment_allocations_payment"
          FOREIGN KEY ("supplier_payment_id") REFERENCES "supplier_payments"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_supplier_payment_allocations_invoice') THEN
          ALTER TABLE "supplier_payment_allocations"
          ADD CONSTRAINT "FK_supplier_payment_allocations_invoice"
          FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS "supplier_payment_allocations" DROP CONSTRAINT IF EXISTS "FK_supplier_payment_allocations_invoice"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "supplier_payment_allocations" DROP CONSTRAINT IF EXISTS "FK_supplier_payment_allocations_payment"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "supplier_payments" DROP CONSTRAINT IF EXISTS "FK_supplier_payments_supplier"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_payment_allocations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_payments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."supplier_payments_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."supplier_payments_status_enum"`);
  }
}
