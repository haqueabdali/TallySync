import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignRefreshTokensTable1785500000000
  implements MigrationInterface
{
  name = 'AlignRefreshTokensTable1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN IF NOT EXISTS "is_revoked" boolean
    `);

    await queryRunner.query(`
      UPDATE "refresh_tokens"
      SET "is_revoked" = false
      WHERE "is_revoked" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ALTER COLUMN "is_revoked" SET DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ALTER COLUMN "is_revoked" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN IF NOT EXISTS "ip_address" varchar(64)
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN IF NOT EXISTS "user_agent" text
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id"
      ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token_hash"
      ON "refresh_tokens" ("token_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_revoked"
      ON "refresh_tokens" ("user_id", "is_revoked")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_refresh_tokens_user_revoked"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_refresh_tokens_token_hash"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_refresh_tokens_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      DROP COLUMN IF EXISTS "user_agent"
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      DROP COLUMN IF EXISTS "ip_address"
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      DROP COLUMN IF EXISTS "is_revoked"
    `);
  }
}