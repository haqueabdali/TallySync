import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AlignSuppliersWithCurrentEntity1788030000000
  implements MigrationInterface
{
  name =
    'AlignSuppliersWithCurrentEntity1788030000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * Original suppliers schema:
     *
     * name, contact_person, email, phone, address, tax_number,
     * payment_terms_days, opening_balance, is_active, notes...
     *
     * Current SupplierEntity/SuppliersService expects a richer contract.
     * Keep old columns for compatibility and add/copy canonical columns.
     */

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "supplier_code"
      varchar(30)
    `);

    /*
     * Generate deterministic codes for any existing rows before NOT NULL.
     */
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          company_id,
          ROW_NUMBER() OVER (
            PARTITION BY company_id
            ORDER BY created_at, id
          ) AS rn
        FROM suppliers
        WHERE supplier_code IS NULL
      )
      UPDATE suppliers AS s
      SET supplier_code =
        'SUP-' ||
        LPAD(
          ranked.rn::text,
          6,
          '0'
        )
      FROM ranked
      WHERE s.id = ranked.id
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "supplier_code"
      SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "company_name"
      varchar(180)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "mobile"
      varchar(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "vat_number"
      varchar(80)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "billing_address"
      text
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "shipping_address"
      text
    `);

    /*
     * Preserve legacy address data as the default billing address.
     */
    await queryRunner.query(`
      UPDATE "suppliers"
      SET "billing_address" =
        COALESCE(
          "billing_address",
          "address"
        )
      WHERE
        "billing_address" IS NULL
        AND "address" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "city"
      varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "state"
      varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "postal_code"
      varchar(30)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "country"
      varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "credit_limit"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "current_balance"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "suppliers"
      SET "current_balance" =
        COALESCE(
          "opening_balance",
          0
        )
      WHERE "current_balance" = 0
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "currency"
      varchar(3)
      NOT NULL DEFAULT 'EUR'
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "payment_terms"
      integer
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "suppliers"
      SET "payment_terms" =
        COALESCE(
          "payment_terms_days",
          0
        )
      WHERE "payment_terms" = 0
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "created_by"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS
        "updated_by"
      uuid
    `);

    /*
     * Normalize current entity lengths/precision.
     */
    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "name"
      TYPE varchar(150)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "contact_person"
      TYPE varchar(150)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "email"
      TYPE varchar(180)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "phone"
      TYPE varchar(40)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "tax_number"
      TYPE varchar(80)
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ALTER COLUMN "opening_balance"
      TYPE numeric(18,2)
      USING "opening_balance"::numeric(18,2)
    `);

    /*
     * Current entity-level indexes.
     */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_suppliers_company"
      ON "suppliers" (
        "company_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_suppliers_company_name"
      ON "suppliers" (
        "company_id",
        "name"
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_suppliers_company_code"
      ON "suppliers" (
        "company_id",
        "supplier_code"
      )
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_suppliers_company_email"
      ON "suppliers" (
        "company_id",
        "email"
      )
      WHERE
        "email" IS NOT NULL
        AND "deleted_at" IS NULL
    `);

    /*
     * Entity check: credit_limit >= 0
     */
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_suppliers_credit_limit'
        ) THEN
          ALTER TABLE "suppliers"
          ADD CONSTRAINT
            "CHK_suppliers_credit_limit"
          CHECK (
            "credit_limit" >= 0
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
      ALTER TABLE "suppliers"
      DROP CONSTRAINT IF EXISTS
        "CHK_suppliers_credit_limit"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_suppliers_company_email"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "UQ_suppliers_company_code"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_suppliers_company"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "payment_terms"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "current_balance"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "credit_limit"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "country"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "postal_code"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "state"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "city"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "shipping_address"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "billing_address"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "vat_number"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "mobile"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "company_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "suppliers"
      DROP COLUMN IF EXISTS
        "supplier_code"
    `);
  }
}
