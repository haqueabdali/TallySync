import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplierDeletionApprovals1789050000000
  implements MigrationInterface
{
  name = 'CreateSupplierDeletionApprovals1789050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supplier_deletion_approvals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "supplier_id" uuid NULL,
        "supplier_snapshot" jsonb NOT NULL,
        "reason" text NULL,

        "requested_by" uuid NULL,
        "requested_at" timestamptz NOT NULL DEFAULT now(),

        "admin_approved_by" uuid NULL,
        "admin_approved_at" timestamptz NULL,

        "owner_approved_by" uuid NULL,
        "owner_approved_at" timestamptz NULL,

        "executed_by" uuid NULL,
        "executed_at" timestamptz NULL,

        "status" varchar(20) NOT NULL DEFAULT 'pending',

        CONSTRAINT "PK_supplier_deletion_approvals"
          PRIMARY KEY ("id"),

        CONSTRAINT "FK_supplier_deletion_approvals_supplier"
          FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION,

        CONSTRAINT "FK_supplier_deletion_approvals_requested_by"
          FOREIGN KEY ("requested_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION,

        CONSTRAINT "FK_supplier_deletion_approvals_admin_approved_by"
          FOREIGN KEY ("admin_approved_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION,

        CONSTRAINT "FK_supplier_deletion_approvals_owner_approved_by"
          FOREIGN KEY ("owner_approved_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION,

        CONSTRAINT "FK_supplier_deletion_approvals_executed_by"
          FOREIGN KEY ("executed_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION,

        CONSTRAINT "CHK_supplier_deletion_approvals_status"
          CHECK (
            "status" IN (
              'pending',
              'approved',
              'executed',
              'cancelled'
            )
          ),

        CONSTRAINT "CHK_supplier_deletion_distinct_approvers"
          CHECK (
            "admin_approved_by" IS NULL
            OR "owner_approved_by" IS NULL
            OR "admin_approved_by" <> "owner_approved_by"
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_supplier_deletion_approvals_company"
      ON "supplier_deletion_approvals" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_supplier_deletion_approvals_supplier"
      ON "supplier_deletion_approvals" ("supplier_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_supplier_deletion_approvals_status"
      ON "supplier_deletion_approvals" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_supplier_deletion_open_request"
      ON "supplier_deletion_approvals" ("company_id", "supplier_id")
      WHERE
        "supplier_id" IS NOT NULL
        AND "status" IN ('pending', 'approved')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_supplier_deletion_open_request"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_supplier_deletion_approvals_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_supplier_deletion_approvals_supplier"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_supplier_deletion_approvals_company"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "supplier_deletion_approvals"
    `);
  }
}
