import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddManufacturingAccountingFoundation1788100000000
  implements MigrationInterface
{
  name =
    'AddManufacturingAccountingFoundation1788100000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "raw_materials_inventory_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "work_in_progress_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "finished_goods_inventory_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "manufacturing_variance_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "direct_labor_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "manufacturing_overhead_account_id"
      uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "auto_post_material_consumption"
      boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "auto_post_production_completion"
      boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      ADD COLUMN IF NOT EXISTS
        "auto_post_production_variance"
      boolean NOT NULL DEFAULT true
    `);

    /*
     * Current Accounting Engine idempotency is keyed by source_type +
     * source_id, so manufacturing documents need explicit source types.
     *
     * PostgreSQL enum values are additive and intentionally not removed
     * in down().
     */
    await queryRunner.query(`
      ALTER TYPE
        "public"."journal_entries_source_type_enum"
      ADD VALUE IF NOT EXISTS
        'material_consumption'
    `);

    await queryRunner.query(`
      ALTER TYPE
        "public"."journal_entries_source_type_enum"
      ADD VALUE IF NOT EXISTS
        'production_completion'
    `);

    await queryRunner.query(`
      ALTER TYPE
        "public"."journal_entries_source_type_enum"
      ADD VALUE IF NOT EXISTS
        'production_variance'
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "auto_post_production_variance"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "auto_post_production_completion"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "auto_post_material_consumption"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "manufacturing_overhead_account_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "direct_labor_account_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "manufacturing_variance_account_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "finished_goods_inventory_account_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "work_in_progress_account_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounting_settings"
      DROP COLUMN IF EXISTS
        "raw_materials_inventory_account_id"
    `);

    /*
     * PostgreSQL enum values are deliberately preserved.
     */
  }
}
