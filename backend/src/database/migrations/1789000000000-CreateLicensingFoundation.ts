import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLicensingFoundation1789000000000 implements MigrationInterface {
  name = 'CreateLicensingFoundation1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'licenses_plan_enum') THEN
          CREATE TYPE "public"."licenses_plan_enum" AS ENUM
          ('starter','business','professional','manufacturing','enterprise','custom');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'licenses_status_enum') THEN
          CREATE TYPE "public"."licenses_status_enum" AS ENUM
          ('draft','active','suspended','expired','revoked');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_features_feature_enum') THEN
          CREATE TYPE "public"."license_features_feature_enum" AS ENUM
          ('accounting','inventory','sales','purchase','manufacturing','wip','costing','vat',
           'asset_management','bank_reconciliation','reporting','mobile_app','api_access','notifications');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_activations_status_enum') THEN
          CREATE TYPE "public"."license_activations_status_enum" AS ENUM ('active','revoked');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "licenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "license_number" character varying(64) NOT NULL,
        "plan" "public"."licenses_plan_enum" NOT NULL DEFAULT 'custom',
        "status" "public"."licenses_status_enum" NOT NULL DEFAULT 'draft',
        "max_users" integer NOT NULL DEFAULT 5,
        "max_concurrent_users" integer,
        "valid_from" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "minimum_version" character varying(32),
        "maximum_version" character varying(32),
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_licenses" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_licenses_max_users" CHECK ("max_users" > 0),
        CONSTRAINT "CHK_licenses_concurrent_users" CHECK (
          "max_concurrent_users" IS NULL OR
          ("max_concurrent_users" > 0 AND "max_concurrent_users" <= "max_users")
        ),
        CONSTRAINT "CHK_licenses_dates" CHECK (
          "valid_from" IS NULL OR "expires_at" IS NULL OR "expires_at" > "valid_from"
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "license_features" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "license_id" uuid NOT NULL,
        "feature" "public"."license_features_feature_enum" NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "feature_limit" integer,
        "config" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_license_features" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_license_features_limit" CHECK (
          "feature_limit" IS NULL OR "feature_limit" >= 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "license_activations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "license_id" uuid NOT NULL,
        "installation_id" character varying(128) NOT NULL,
        "fingerprint_hash" character varying(128) NOT NULL,
        "app_version" character varying(32) NOT NULL,
        "status" "public"."license_activations_status_enum" NOT NULL DEFAULT 'active',
        "activated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_seen_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_license_activations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "license_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "license_id" uuid NOT NULL,
        "actor_user_id" uuid,
        "action" character varying(64) NOT NULL,
        "metadata" jsonb,
        "ip_address" character varying(64),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_license_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_licenses_number" ON "licenses" ("license_number")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_licenses_company_live" ON "licenses" ("company_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_licenses_company_status" ON "licenses" ("company_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_licenses_status_expiry" ON "licenses" ("status", "expires_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_license_features_license_feature" ON "license_features" ("license_id", "feature")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_license_features_license" ON "license_features" ("license_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_license_activations_installation" ON "license_activations" ("license_id", "installation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_license_activations_license" ON "license_activations" ("license_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_license_activations_status_seen" ON "license_activations" ("status", "last_seen_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_license_audit_logs_license_created" ON "license_audit_logs" ("license_id", "created_at")`,
    );

    await queryRunner.query(`
      ALTER TABLE "licenses"
      ADD CONSTRAINT "FK_licenses_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "licenses"
      ADD CONSTRAINT "FK_licenses_created_by"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "licenses"
      ADD CONSTRAINT "FK_licenses_updated_by"
      FOREIGN KEY ("updated_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "license_features"
      ADD CONSTRAINT "FK_license_features_license"
      FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "license_activations"
      ADD CONSTRAINT "FK_license_activations_license"
      FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "license_audit_logs"
      ADD CONSTRAINT "FK_license_audit_logs_license"
      FOREIGN KEY ("license_id") REFERENCES "licenses"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "license_audit_logs"
      ADD CONSTRAINT "FK_license_audit_logs_actor"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "license_audit_logs" DROP CONSTRAINT IF EXISTS "FK_license_audit_logs_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_audit_logs" DROP CONSTRAINT IF EXISTS "FK_license_audit_logs_license"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_activations" DROP CONSTRAINT IF EXISTS "FK_license_activations_license"`,
    );
    await queryRunner.query(
      `ALTER TABLE "license_features" DROP CONSTRAINT IF EXISTS "FK_license_features_license"`,
    );
    await queryRunner.query(
      `ALTER TABLE "licenses" DROP CONSTRAINT IF EXISTS "FK_licenses_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "licenses" DROP CONSTRAINT IF EXISTS "FK_licenses_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "licenses" DROP CONSTRAINT IF EXISTS "FK_licenses_company"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "license_audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "license_activations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "license_features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "licenses"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."license_activations_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."license_features_feature_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."licenses_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."licenses_plan_enum"`,
    );
  }
}
