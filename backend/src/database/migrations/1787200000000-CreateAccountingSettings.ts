import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountingSettings1787200000000
  implements MigrationInterface
{
  name = 'CreateAccountingSettings1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounting_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "accounts_receivable_account_id" uuid,
        "accounts_payable_account_id" uuid,
        "sales_revenue_account_id" uuid,
        "sales_returns_account_id" uuid,
        "output_tax_account_id" uuid,
        "input_tax_account_id" uuid,
        "inventory_account_id" uuid,
        "cost_of_goods_sold_account_id" uuid,
        "cash_account_id" uuid,
        "bank_account_id" uuid,
        "card_clearing_account_id" uuid,
        "goods_received_not_invoiced_account_id" uuid,
        "purchase_expense_account_id" uuid,
        "rounding_difference_account_id" uuid,
        "default_currency" character varying(3)
          NOT NULL DEFAULT 'EUR',
        "auto_post_sales_invoices" boolean
          NOT NULL DEFAULT true,
        "auto_post_customer_payments" boolean
          NOT NULL DEFAULT true,
        "auto_post_sales_returns" boolean
          NOT NULL DEFAULT true,
        "auto_post_goods_receipts" boolean
          NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounting_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_accounting_settings_company"
      ON "accounting_settings" ("company_id")
    `);

    const foreignKeys = [
      ['FK_accounting_settings_accounts_receivable', 'accounts_receivable_account_id'],
      ['FK_accounting_settings_accounts_payable', 'accounts_payable_account_id'],
      ['FK_accounting_settings_sales_revenue', 'sales_revenue_account_id'],
      ['FK_accounting_settings_sales_returns', 'sales_returns_account_id'],
      ['FK_accounting_settings_output_tax', 'output_tax_account_id'],
      ['FK_accounting_settings_input_tax', 'input_tax_account_id'],
      ['FK_accounting_settings_inventory', 'inventory_account_id'],
      ['FK_accounting_settings_cogs', 'cost_of_goods_sold_account_id'],
      ['FK_accounting_settings_cash', 'cash_account_id'],
      ['FK_accounting_settings_bank', 'bank_account_id'],
      ['FK_accounting_settings_card_clearing', 'card_clearing_account_id'],
      ['FK_accounting_settings_grni', 'goods_received_not_invoiced_account_id'],
      ['FK_accounting_settings_purchase_expense', 'purchase_expense_account_id'],
      ['FK_accounting_settings_rounding_difference', 'rounding_difference_account_id'],
    ] as const;

    for (const [constraintName, columnName] of foreignKeys) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = '${constraintName}'
          ) THEN
            ALTER TABLE "accounting_settings"
            ADD CONSTRAINT "${constraintName}"
            FOREIGN KEY ("${columnName}")
            REFERENCES "accounts"("id")
            ON DELETE SET NULL
            ON UPDATE NO ACTION;
          END IF;
        END
        $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const constraints = [
      'FK_accounting_settings_rounding_difference',
      'FK_accounting_settings_purchase_expense',
      'FK_accounting_settings_grni',
      'FK_accounting_settings_card_clearing',
      'FK_accounting_settings_bank',
      'FK_accounting_settings_cash',
      'FK_accounting_settings_cogs',
      'FK_accounting_settings_inventory',
      'FK_accounting_settings_input_tax',
      'FK_accounting_settings_output_tax',
      'FK_accounting_settings_sales_returns',
      'FK_accounting_settings_sales_revenue',
      'FK_accounting_settings_accounts_payable',
      'FK_accounting_settings_accounts_receivable',
    ];

    for (const constraintName of constraints) {
      await queryRunner.query(`
        ALTER TABLE IF EXISTS "accounting_settings"
        DROP CONSTRAINT IF EXISTS "${constraintName}"
      `);
    }

    await queryRunner.query(`
      DROP TABLE IF EXISTS "accounting_settings"
    `);
  }
}
