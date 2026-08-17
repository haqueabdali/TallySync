import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AlignCoreEntitySchemaContracts1788070000000
  implements MigrationInterface
{
  name =
    'AlignCoreEntitySchemaContracts1788070000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * ------------------------------------------------------------------
     * Blocking mismatches reported by audit:entity-schema
     * ------------------------------------------------------------------
     */

    /*
     * UserEntity intentionally permits companyId = null and the relation
     * uses nullable:true / onDelete:SET NULL. The historical DB column
     * remained NOT NULL.
     */
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "company_id"
      DROP NOT NULL
    `);

    /*
     * AuditLogEntity permits companyId = null so global/system audit
     * events are representable.
     */
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ALTER COLUMN "company_id"
      DROP NOT NULL
    `);

    /*
     * Fields currently written/read by UsersService and AuditLogEntity.
     */
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS
        "old_values"
      jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS
        "new_values"
      jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS
        "user_agent"
      varchar(512)
    `);

    /*
     * Legacy inventory CategoryEntity still persists tallyGroup.
     */
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS
        "tally_group"
      varchar(255)
    `);

    /*
     * Current SalesOrderEntity explicitly makes createdBy nullable.
     * This is needed for imported/system-created orders and for metadata
     * consistency with the current entity.
     */
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ALTER COLUMN "created_by"
      DROP NOT NULL
    `);

    /*
     * ------------------------------------------------------------------
     * Non-blocking warnings
     * ------------------------------------------------------------------
     *
     * The entity contract is stricter than the database for these fields.
     * Tighten them only when existing legacy data contains no NULL rows.
     * This makes fresh/test databases fully aligned without breaking an
     * existing installation that contains historical incomplete rows.
     */

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "users"
          WHERE "role_id" IS NULL
        ) THEN
          ALTER TABLE "users"
          ALTER COLUMN "role_id"
          SET NOT NULL;
        ELSE
          RAISE NOTICE
            'users.role_id contains NULL values; NOT NULL was not applied';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "audit_logs"
          WHERE "entity_type" IS NULL
        ) THEN
          ALTER TABLE "audit_logs"
          ALTER COLUMN "entity_type"
          SET NOT NULL;
        ELSE
          RAISE NOTICE
            'audit_logs.entity_type contains NULL values; NOT NULL was not applied';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "sales_orders"
          WHERE "warehouse_id" IS NULL
        ) THEN
          ALTER TABLE "sales_orders"
          ALTER COLUMN "warehouse_id"
          SET NOT NULL;
        ELSE
          RAISE NOTICE
            'sales_orders.warehouse_id contains NULL values; NOT NULL was not applied';
        END IF;
      END
      $$;
    `);

    /*
     * Useful indexes for the audit-log access patterns used by UsersService.
     */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_audit_logs_entity"
      ON "audit_logs" (
        "entity_type",
        "entity_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_audit_logs_company_created"
      ON "audit_logs" (
        "company_id",
        "created_at"
      )
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_audit_logs_company_created"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS
        "IDX_audit_logs_entity"
    `);

    /*
     * Do not automatically restore NOT NULL to columns whose current
     * entity contract explicitly allows NULL; doing so can make rollback
     * destructive if new null rows have since been created.
     */

    await queryRunner.query(`
      ALTER TABLE "categories"
      DROP COLUMN IF EXISTS
        "tally_group"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS
        "user_agent"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS
        "new_values"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS
        "old_values"
    `);
  }
}
