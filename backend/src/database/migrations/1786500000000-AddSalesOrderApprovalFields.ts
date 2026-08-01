import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesOrderApprovalFields1786500000000
  implements MigrationInterface
{
  name = 'AddSalesOrderApprovalFields1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "approved_at"
      TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "rejection_reason" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "rejection_reason"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "approved_at"
    `);
  }
}
