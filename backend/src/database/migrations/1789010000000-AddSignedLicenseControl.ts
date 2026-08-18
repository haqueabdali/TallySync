import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignedLicenseControl1789010000000 implements MigrationInterface {
  name = 'AddSignedLicenseControl1789010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "licenses"
      ADD COLUMN IF NOT EXISTS "certificate_payload" jsonb,
      ADD COLUMN IF NOT EXISTS "certificate_signature" text,
      ADD COLUMN IF NOT EXISTS "certificate_payload_hash" character varying(64),
      ADD COLUMN IF NOT EXISTS "certificate_key_id" character varying(64),
      ADD COLUMN IF NOT EXISTS "certificate_issued_at" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "license_activations"
      ADD COLUMN IF NOT EXISTS "activation_token_hash" character varying(64),
      ADD COLUMN IF NOT EXISTS "last_ip_address" character varying(64),
      ADD COLUMN IF NOT EXISTS "last_user_agent" character varying(255)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_activations_token_hash"
      ON "license_activations" ("activation_token_hash")
      WHERE "activation_token_hash" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_licenses_certificate_key"
      ON "licenses" ("certificate_key_id")
      WHERE "certificate_signature" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_licenses_certificate_key"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_license_activations_token_hash"`,
    );

    await queryRunner.query(`
      ALTER TABLE "license_activations"
      DROP COLUMN IF EXISTS "last_user_agent",
      DROP COLUMN IF EXISTS "last_ip_address",
      DROP COLUMN IF EXISTS "activation_token_hash"
    `);

    await queryRunner.query(`
      ALTER TABLE "licenses"
      DROP COLUMN IF EXISTS "certificate_issued_at",
      DROP COLUMN IF EXISTS "certificate_key_id",
      DROP COLUMN IF EXISTS "certificate_payload_hash",
      DROP COLUMN IF EXISTS "certificate_signature",
      DROP COLUMN IF EXISTS "certificate_payload"
    `);
  }
}
