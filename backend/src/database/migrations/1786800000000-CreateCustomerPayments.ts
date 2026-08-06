import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerPayments1786800000000
  implements MigrationInterface
{
  name = 'CreateCustomerPayments1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'customer_payments_status_enum'
        ) THEN
          CREATE TYPE "public"."customer_payments_status_enum"
          AS ENUM ('draft', 'posted', 'reversed', 'cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'customer_payments_method_enum'
        ) THEN
          CREATE TYPE "public"."customer_payments_method_enum"
          AS ENUM (
            'cash',
            'bank_transfer',
            'card',
            'cheque',
            'other'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "payment_number" character varying(50) NOT NULL,
        "payment_date" date NOT NULL,
        "payment_method" "public"."customer_payments_method_enum"
          NOT NULL DEFAULT 'cash',
        "status" "public"."customer_payments_status_enum"
          NOT NULL DEFAULT 'draft',
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
        "reversed_by" uuid,
        "reversed_at" TIMESTAMP WITH TIME ZONE,
        "reversal_reason" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_customer_payments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_customer_payments_amount"
          CHECK ("amount" > 0),
        CONSTRAINT "CHK_customer_payments_allocated_amount"
          CHECK ("allocated_amount" >= 0),
        CONSTRAINT "CHK_customer_payments_unallocated_amount"
          CHECK ("unallocated_amount" >= 0),
        CONSTRAINT "CHK_customer_payments_total"
          CHECK (
            "allocated_amount" + "unallocated_amount" = "amount"
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_payment_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_payment_id" uuid NOT NULL,
        "sales_invoice_id" uuid NOT NULL,
        "allocated_amount" numeric(18,2) NOT NULL,
        "invoice_balance_before" numeric(18,2) NOT NULL DEFAULT 0,
        "invoice_balance_after" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_customer_payment_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_customer_payment_allocations_amount"
          CHECK ("allocated_amount" > 0),
        CONSTRAINT "CHK_customer_payment_allocations_balance_before"
          CHECK ("invoice_balance_before" >= 0),
        CONSTRAINT "CHK_customer_payment_allocations_balance_after"
          CHECK ("invoice_balance_after" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_payments_company"
      ON "customer_payments" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_payments_customer"
      ON "customer_payments" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_payments_status"
      ON "customer_payments" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_payments_payment_date"
      ON "customer_payments" ("company_id", "payment_date")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_customer_payments_company_number"
      ON "customer_payments" ("company_id", "payment_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_customer_payment_allocations_payment"
      ON "customer_payment_allocations" ("customer_payment_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_customer_payment_allocations_invoice"
      ON "customer_payment_allocations" ("sales_invoice_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_customer_payment_allocation_payment_invoice"
      ON "customer_payment_allocations"
        ("customer_payment_id", "sales_invoice_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_customer_payments_customer'
        ) THEN
          ALTER TABLE "customer_payments"
          ADD CONSTRAINT "FK_customer_payments_customer"
          FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_customer_payment_allocations_payment'
        ) THEN
          ALTER TABLE "customer_payment_allocations"
          ADD CONSTRAINT "FK_customer_payment_allocations_payment"
          FOREIGN KEY ("customer_payment_id")
          REFERENCES "customer_payments"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_customer_payment_allocations_invoice'
        ) THEN
          ALTER TABLE "customer_payment_allocations"
          ADD CONSTRAINT "FK_customer_payment_allocations_invoice"
          FOREIGN KEY ("sales_invoice_id")
          REFERENCES "sales_invoices"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "customer_payment_allocations"
      DROP CONSTRAINT IF EXISTS
        "FK_customer_payment_allocations_invoice"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "customer_payment_allocations"
      DROP CONSTRAINT IF EXISTS
        "FK_customer_payment_allocations_payment"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "customer_payments"
      DROP CONSTRAINT IF EXISTS "FK_customer_payments_customer"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "customer_payment_allocations"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "customer_payments"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."customer_payments_method_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."customer_payments_status_enum"
    `);
  }
}
