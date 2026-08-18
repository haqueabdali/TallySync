import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConcurrentSessionControl1789020000000 implements MigrationInterface {
  name = 'AddConcurrentSessionControl1789020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "license_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "license_id" uuid,
        "company_id" uuid,
        "user_id" uuid NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "ip_address" inet,
        "user_agent" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_license_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_license_sessions_expiry" CHECK ("expires_at" > "created_at")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_sessions_company_activity"
      ON "license_sessions" ("company_id", "is_revoked", "last_seen_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_sessions_user_activity"
      ON "license_sessions" ("user_id", "is_revoked", "last_seen_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_sessions_license"
      ON "license_sessions" ("license_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_sessions_expires"
      ON "license_sessions" ("expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "license_sessions"
      ADD CONSTRAINT "FK_license_sessions_license"
      FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "license_sessions"
      ADD CONSTRAINT "FK_license_sessions_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "license_sessions"
      ADD CONSTRAINT "FK_license_sessions_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN IF NOT EXISTS "session_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_session"
      ON "refresh_tokens" ("session_id")
      WHERE "session_id" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD CONSTRAINT "FK_refresh_tokens_session"
      FOREIGN KEY ("session_id") REFERENCES "license_sessions"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_session"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "session_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "license_sessions" DROP CONSTRAINT IF EXISTS "FK_license_sessions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_sessions" DROP CONSTRAINT IF EXISTS "FK_license_sessions_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_sessions" DROP CONSTRAINT IF EXISTS "FK_license_sessions_license"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "license_sessions"`);
  }
}
