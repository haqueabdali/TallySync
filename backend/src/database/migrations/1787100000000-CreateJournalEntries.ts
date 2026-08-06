import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJournalEntries1787100000000
  implements MigrationInterface
{
  name = 'CreateJournalEntries1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'journal_entries_status_enum'
        ) THEN
          CREATE TYPE "public"."journal_entries_status_enum"
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
          WHERE typname = 'journal_entries_source_type_enum'
        ) THEN
          CREATE TYPE "public"."journal_entries_source_type_enum"
          AS ENUM (
            'manual',
            'sales_invoice',
            'customer_payment',
            'sales_return',
            'goods_receipt',
            'purchase_invoice',
            'supplier_payment',
            'inventory_adjustment',
            'opening_balance',
            'other'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "journal_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "entry_number" character varying(50) NOT NULL,
        "entry_date" date NOT NULL,
        "status" "public"."journal_entries_status_enum"
          NOT NULL DEFAULT 'draft',
        "source_type" "public"."journal_entries_source_type_enum"
          NOT NULL DEFAULT 'manual',
        "source_id" uuid,
        "reference_number" character varying(120),
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "total_debit" numeric(18,2) NOT NULL DEFAULT 0,
        "total_credit" numeric(18,2) NOT NULL DEFAULT 0,
        "narration" text,
        "created_by" uuid,
        "updated_by" uuid,
        "posted_by" uuid,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "reversed_by" uuid,
        "reversed_at" TIMESTAMP WITH TIME ZONE,
        "reversal_reason" text,
        "reversal_entry_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_journal_entries" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_journal_entries_total_debit"
          CHECK ("total_debit" >= 0),
        CONSTRAINT "CHK_journal_entries_total_credit"
          CHECK ("total_credit" >= 0),
        CONSTRAINT "CHK_journal_entries_balanced"
          CHECK ("total_debit" = "total_credit")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "journal_entry_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "journal_entry_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "debit" numeric(18,2) NOT NULL DEFAULT 0,
        "credit" numeric(18,2) NOT NULL DEFAULT 0,
        "party_type" character varying(30),
        "party_id" uuid,
        "cost_center" character varying(120),
        "description" text,
        CONSTRAINT "PK_journal_entry_lines" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_journal_entry_lines_amount"
          CHECK (
            ("debit" > 0 AND "credit" = 0)
            OR
            ("credit" > 0 AND "debit" = 0)
          ),
        CONSTRAINT "CHK_journal_entry_lines_party"
          CHECK (
            ("party_type" IS NULL AND "party_id" IS NULL)
            OR
            ("party_type" IS NOT NULL AND "party_id" IS NOT NULL)
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entries_company"
      ON "journal_entries" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entries_entry_date"
      ON "journal_entries" ("company_id", "entry_date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entries_status"
      ON "journal_entries" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entries_source"
      ON "journal_entries"
        ("company_id", "source_type", "source_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_journal_entries_company_number"
      ON "journal_entries" ("company_id", "entry_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entry_lines_entry"
      ON "journal_entry_lines" ("journal_entry_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entry_lines_account"
      ON "journal_entry_lines" ("account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_journal_entry_lines_party"
      ON "journal_entry_lines" ("party_type", "party_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_journal_entries_reversal_entry'
        ) THEN
          ALTER TABLE "journal_entries"
          ADD CONSTRAINT "FK_journal_entries_reversal_entry"
          FOREIGN KEY ("reversal_entry_id")
          REFERENCES "journal_entries"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_journal_entry_lines_entry'
        ) THEN
          ALTER TABLE "journal_entry_lines"
          ADD CONSTRAINT "FK_journal_entry_lines_entry"
          FOREIGN KEY ("journal_entry_id")
          REFERENCES "journal_entries"("id")
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
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_journal_entry_lines_account'
        ) THEN
          ALTER TABLE "journal_entry_lines"
          ADD CONSTRAINT "FK_journal_entry_lines_account"
          FOREIGN KEY ("account_id")
          REFERENCES "accounts"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "journal_entry_lines"
      DROP CONSTRAINT IF EXISTS "FK_journal_entry_lines_account"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "journal_entry_lines"
      DROP CONSTRAINT IF EXISTS "FK_journal_entry_lines_entry"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "journal_entries"
      DROP CONSTRAINT IF EXISTS "FK_journal_entries_reversal_entry"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "journal_entry_lines"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "journal_entries"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."journal_entries_source_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."journal_entries_status_enum"
    `);
  }
}
