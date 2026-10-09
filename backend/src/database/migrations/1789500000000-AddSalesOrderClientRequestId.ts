import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesOrderClientRequestId1789500000000
  implements MigrationInterface
{
  name = 'AddSalesOrderClientRequestId1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      ADD COLUMN "client_request_id" uuid NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_sales_orders_company_client_request"
      ON "sales_orders" ("company_id", "client_request_id")
      WHERE "client_request_id" IS NOT NULL
        AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_sales_orders_company_client_request"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales_orders"
      DROP COLUMN IF EXISTS "client_request_id"
    `);
  }
}
