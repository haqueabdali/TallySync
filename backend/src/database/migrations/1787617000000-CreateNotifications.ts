import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1787617000000 implements MigrationInterface {
  name = 'CreateNotifications1787617000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "notification_channel_enum" AS ENUM ('in_app', 'email', 'sms', 'webhook')`);
    await queryRunner.query(`CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'queued', 'sent', 'failed', 'cancelled')`);
    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "code" character varying(100) NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "subjectTemplate" character varying(255),
        "bodyTemplate" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdById" uuid NOT NULL,
        "updatedById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notification_templates_company" ON "notification_templates" ("companyId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notification_templates_company_code_channel" ON "notification_templates" ("companyId", "code", "channel") WHERE "deletedAt" IS NULL`);

    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preferences_company_user_channel" UNIQUE ("companyId", "userId", "channel")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notification_preferences_company" ON "notification_preferences" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notification_preferences_user" ON "notification_preferences" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "recipientUserId" uuid,
        "channel" "notification_channel_enum" NOT NULL,
        "recipient" character varying(500) NOT NULL,
        "subject" character varying(255),
        "body" text NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "idempotencyKey" character varying(200),
        "providerMessageId" character varying(255),
        "errorMessage" character varying(10000),
        "availableAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_company" ON "notifications" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_company_recipient_created" ON "notifications" ("companyId", "recipientUserId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_status_available" ON "notifications" ("status", "availableAt")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notifications_company_idempotency" ON "notifications" ("companyId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TABLE "notification_templates"`);
    await queryRunner.query(`DROP TYPE "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE "notification_channel_enum"`);
  }
}
