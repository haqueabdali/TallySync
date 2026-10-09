import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTallyAccountingSyncs1789400000000
  implements MigrationInterface
{
  name = 'CreateTallyAccountingSyncs1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tally_accounting_syncs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "source_type" varchar(40) NOT NULL,
        "source_id" uuid NOT NULL,
        "voucher_type" varchar(40) NOT NULL,
        "voucher_number" varchar(80) NOT NULL,
        "tally_voucher_id" varchar(120) NULL,
        "tally_guid" varchar(120) NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "sync_attempts" integer NOT NULL DEFAULT 0,
        "last_error" text NULL,
        "synced_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tally_accounting_syncs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_tally_accounting_syncs_status"
          CHECK ("status" IN ('pending', 'syncing', 'synced', 'failed'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tally_accounting_syncs_source"
      ON "tally_accounting_syncs" ("company_id", "source_type", "source_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tally_accounting_syncs_company"
      ON "tally_accounting_syncs" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tally_accounting_syncs_status"
      ON "tally_accounting_syncs" ("company_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "tally_accounting_syncs"');
  }
}
