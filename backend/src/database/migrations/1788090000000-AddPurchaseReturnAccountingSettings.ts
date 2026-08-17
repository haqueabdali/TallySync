import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddPurchaseReturnAccountingSettings1788090000000
  implements MigrationInterface
{
  name =
    'AddPurchaseReturnAccountingSettings1788090000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * PurchaseReturnPostingRule already supports a dedicated purchase
     * returns account with inventory fallback. Persist that configuration.
     */
    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "purchase_returns_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "auto_post_purchase_returns"
      boolean NOT NULL DEFAULT true
    `);

    /*
     * Current source enum does not yet expose purchase_return even though
     * PurchaseReturnPostingRule already uses it.
     */
    await queryRunner.query(`
      ALTER TYPE "public"."journal_entries_source_type_enum"
      ADD VALUE IF NOT EXISTS 'purchase_return'
    `);

    /*
     * Do not add a hard FK for the account mapping here: the existing
     * accounting_settings account columns follow the same loose mapping
     * pattern and are validated through AccountingSettingsService.
     */
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * PostgreSQL enum values are intentionally not removed in-place.
     */

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "auto_post_purchase_returns"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "purchase_returns_account_id"
    `);
  }
}
