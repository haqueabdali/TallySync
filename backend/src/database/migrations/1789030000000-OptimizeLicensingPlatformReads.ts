import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeLicensingPlatformReads1789030000000
  implements MigrationInterface
{
  name = 'OptimizeLicensingPlatformReads1789030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_licenses_live_expiry"
      ON "licenses" ("expires_at")
      WHERE "deleted_at" IS NULL AND "expires_at" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_license_activations_license_status"
      ON "license_activations" ("license_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_company_status_live"
      ON "users" ("company_id", "status")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_company_status_live"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_license_activations_license_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_licenses_live_expiry"`,
    );
  }
}
