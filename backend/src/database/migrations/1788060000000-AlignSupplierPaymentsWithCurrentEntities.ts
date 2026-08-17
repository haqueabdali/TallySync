import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AlignSupplierPaymentsWithCurrentEntities1788060000000
  implements MigrationInterface
{
  name =
    'AlignSupplierPaymentsWithCurrentEntities1788060000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * 178580 created supplier_payments first.
     * 178740 contains the richer current schema but uses
     * CREATE TABLE IF NOT EXISTS, so it never upgraded the live table.
     *
     * Add all missing current fields to the existing tables.
     */

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "bank_account_name"
      varchar(150)
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "cheque_number"
      varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "cheque_date"
      date
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "posted_by"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "posted_at"
      timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "cancelled_by"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      ADD COLUMN IF NOT EXISTS
        "cancelled_at"
      timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations"
      ADD COLUMN IF NOT EXISTS
        "invoice_balance_before"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations"
      ADD COLUMN IF NOT EXISTS
        "invoice_balance_after"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_supplier_payments_date"
      ON "supplier_payments" (
        "company_id",
        "payment_date"
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_supplier_payment_allocations_before'
        ) THEN
          ALTER TABLE
            "supplier_payment_allocations"
          ADD CONSTRAINT
            "CHK_supplier_payment_allocations_before"
          CHECK (
            "invoice_balance_before" >= 0
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_supplier_payment_allocations_after'
        ) THEN
          ALTER TABLE
            "supplier_payment_allocations"
          ADD CONSTRAINT
            "CHK_supplier_payment_allocations_after"
          CHECK (
            "invoice_balance_after" >= 0
          );
        END IF;
      END
      $$;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE
        "supplier_payment_allocations"
      DROP CONSTRAINT IF EXISTS
        "CHK_supplier_payment_allocations_after"
    `);

    await queryRunner.query(`
      ALTER TABLE
        "supplier_payment_allocations"
      DROP CONSTRAINT IF EXISTS
        "CHK_supplier_payment_allocations_before"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_supplier_payments_date"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations"
      DROP COLUMN IF EXISTS
        "invoice_balance_after"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations"
      DROP COLUMN IF EXISTS
        "invoice_balance_before"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "cancelled_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "cancelled_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "posted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "posted_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "cheque_date"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "cheque_number"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_payments"
      DROP COLUMN IF EXISTS
        "bank_account_name"
    `);
  }
}
