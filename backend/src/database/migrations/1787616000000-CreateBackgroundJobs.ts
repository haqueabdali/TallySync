import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBackgroundJobs1787616000000 implements MigrationInterface {
  name = 'CreateBackgroundJobs1787616000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "background_job_status_enum" AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "background_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "type" character varying(120) NOT NULL,
        "queue" character varying(120),
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "result" jsonb,
        "status" "background_job_status_enum" NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 3,
        "priority" integer NOT NULL DEFAULT 0,
        "availableAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "startedAt" TIMESTAMPTZ,
        "completedAt" TIMESTAMPTZ,
        "failedAt" TIMESTAMPTZ,
        "cancelledAt" TIMESTAMPTZ,
        "lockedAt" TIMESTAMPTZ,
        "lockedBy" character varying(180),
        "errorMessage" text,
        "idempotencyKey" character varying(255),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_background_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_background_jobs_attempts" CHECK ("attempts" >= 0),
        CONSTRAINT "CHK_background_jobs_max_attempts" CHECK ("maxAttempts" BETWEEN 1 AND 20)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_background_jobs_due"
      ON "background_jobs" ("status", "availableAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_background_jobs_company_status"
      ON "background_jobs" ("companyId", "status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_background_jobs_company_idempotency"
      ON "background_jobs" ("companyId", "idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "background_jobs"');
    await queryRunner.query('DROP TYPE "background_job_status_enum"');
  }
}
