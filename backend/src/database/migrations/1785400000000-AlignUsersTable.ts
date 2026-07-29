import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignUsersTable1785400000000
  implements MigrationInterface
{
  name = 'AlignUsersTable1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "full_name" varchar(255)
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "full_name" = NULLIF(
        TRIM(
          CONCAT(
            COALESCE("first_name", ''),
            ' ',
            COALESCE("last_name", '')
          )
        ),
        ''
      )
      WHERE "full_name" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "full_name" = COALESCE(
        "full_name",
        NULLIF(split_part("email", '@', 1), ''),
        'User'
      )
      WHERE "full_name" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "full_name" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "phone" varchar(32)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'users_status_enum'
        ) THEN
          CREATE TYPE "users_status_enum"
          AS ENUM ('active', 'inactive', 'suspended');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "status" "users_status_enum"
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "status" =
        CASE
          WHEN "is_active" = true
            THEN 'active'::"users_status_enum"
          ELSE 'inactive'::"users_status_enum"
        END
      WHERE "status" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "status"
      SET DEFAULT 'active'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "status" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_company_id"
      ON "users" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_role_id"
      ON "users" ("role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_company_role"
      ON "users" ("company_id", "role_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_company_role"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_role_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_company_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "status"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "users_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "phone"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "full_name"
    `);
  }
}