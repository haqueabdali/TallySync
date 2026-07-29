import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignCoreEntities1784300000000 implements MigrationInterface {
  name = 'AlignCoreEntities1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "roles"
      ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "tally_company_name" varchar(255)
    `);

    await queryRunner.query(`
      UPDATE "companies"
      SET "tally_company_name" = "name"
      WHERE "tally_company_name" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ALTER COLUMN "tally_company_name" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_token_hash" varchar(64)
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "last_login_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz
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
      DROP COLUMN IF EXISTS "deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "last_login_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "reset_token_expires_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "reset_token_hash"
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "is_active"
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "tally_company_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
      DROP COLUMN IF EXISTS "is_system"
    `);
  }
}
