import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddPurchaseAutoPostSettings1788020000000
  implements MigrationInterface
{
  name =
    'AddPurchaseAutoPostSettings1788020000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "auto_post_purchase_invoices"
      boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "auto_post_supplier_payments"
      boolean NOT NULL DEFAULT true
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "auto_post_supplier_payments"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "auto_post_purchase_invoices"
    `);
  }
}
