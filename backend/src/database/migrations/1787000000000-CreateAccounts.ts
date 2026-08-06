import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccounts1787000000000
  implements MigrationInterface
{
  name = 'CreateAccounts1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'accounts_type_enum'
        ) THEN
          CREATE TYPE "public"."accounts_type_enum"
          AS ENUM (
            'asset',
            'liability',
            'equity',
            'income',
            'expense'
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
          FROM pg_type
          WHERE typname = 'accounts_normal_balance_enum'
        ) THEN
          CREATE TYPE "public"."accounts_normal_balance_enum"
          AS ENUM ('debit', 'credit');
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
          WHERE typname = 'accounts_status_enum'
        ) THEN
          CREATE TYPE "public"."accounts_status_enum"
          AS ENUM ('active', 'inactive');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "code" character varying(30) NOT NULL,
        "name" character varying(180) NOT NULL,
        "type" "public"."accounts_type_enum" NOT NULL,
        "normal_balance"
          "public"."accounts_normal_balance_enum" NOT NULL,
        "status" "public"."accounts_status_enum"
          NOT NULL DEFAULT 'active',
        "parent_id" uuid,
        "is_group" boolean NOT NULL DEFAULT false,
        "is_system_account" boolean NOT NULL DEFAULT false,
        "allow_manual_entry" boolean NOT NULL DEFAULT true,
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "description" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_accounts_company"
      ON "accounts" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_accounts_parent"
      ON "accounts" ("parent_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_accounts_type"
      ON "accounts" ("company_id", "type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_accounts_status"
      ON "accounts" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_accounts_company_code"
      ON "accounts" ("company_id", "code")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_accounts_parent'
        ) THEN
          ALTER TABLE "accounts"
          ADD CONSTRAINT "FK_accounts_parent"
          FOREIGN KEY ("parent_id")
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
      ALTER TABLE IF EXISTS "accounts"
      DROP CONSTRAINT IF EXISTS "FK_accounts_parent"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "accounts"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."accounts_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."accounts_normal_balance_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."accounts_type_enum"
    `);
  }
}
