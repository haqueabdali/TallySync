import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesOrderApprovalAndTallyItemName1786400000000
  implements MigrationInterface
{
  name = 'AddSalesOrderApprovalAndTallyItemName1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN IF NOT EXISTS "approved_by" uuid
    `);

    await queryRunner.query(`
  ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "approved_at"
  TIMESTAMP WITH TIME ZONE
`);

    await queryRunner.query(`
      ALTER TABLE "items"
      ADD COLUMN IF NOT EXISTS "tally_item_name"
      character varying(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "items"
      DROP COLUMN IF EXISTS "tally_item_name"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "approved_by"
    `);

    await queryRunner.query(`
  ALTER TABLE "sales_orders"
  DROP COLUMN IF EXISTS "approved_at"
`);
  }
}
