import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenSupplierDeletionApprovals1789060000000
  implements MigrationInterface
{
  name = 'HardenSupplierDeletionApprovals1789060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
     * Migration 70 already creates the hardened schema for fresh databases.
     *
     * This forward migration exists because some databases may have executed
     * an earlier version of migration 70 before the audit-user foreign keys
     * and nullable requested_by contract were added.
     */

    await queryRunner.query(`
      ALTER TABLE "supplier_deletion_approvals"
      ALTER COLUMN "requested_by" DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'FK_supplier_deletion_approvals_requested_by'
        ) THEN
          ALTER TABLE "supplier_deletion_approvals"
          ADD CONSTRAINT
            "FK_supplier_deletion_approvals_requested_by"
          FOREIGN KEY ("requested_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'FK_supplier_deletion_approvals_admin_approved_by'
        ) THEN
          ALTER TABLE "supplier_deletion_approvals"
          ADD CONSTRAINT
            "FK_supplier_deletion_approvals_admin_approved_by"
          FOREIGN KEY ("admin_approved_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'FK_supplier_deletion_approvals_owner_approved_by'
        ) THEN
          ALTER TABLE "supplier_deletion_approvals"
          ADD CONSTRAINT
            "FK_supplier_deletion_approvals_owner_approved_by"
          FOREIGN KEY ("owner_approved_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'FK_supplier_deletion_approvals_executed_by'
        ) THEN
          ALTER TABLE "supplier_deletion_approvals"
          ADD CONSTRAINT
            "FK_supplier_deletion_approvals_executed_by"
          FOREIGN KEY ("executed_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_deletion_approvals"
      DROP CONSTRAINT IF EXISTS
        "FK_supplier_deletion_approvals_executed_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_deletion_approvals"
      DROP CONSTRAINT IF EXISTS
        "FK_supplier_deletion_approvals_owner_approved_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_deletion_approvals"
      DROP CONSTRAINT IF EXISTS
        "FK_supplier_deletion_approvals_admin_approved_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_deletion_approvals"
      DROP CONSTRAINT IF EXISTS
        "FK_supplier_deletion_approvals_requested_by"
    `);

    /*
     * Do not restore NOT NULL here. After this migration has been in use,
     * an audit actor may legitimately have been deleted and requested_by
     * may therefore contain NULL.
     */
  }
}
