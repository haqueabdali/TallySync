import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddManufacturingActualCostContracts1788110000000
  implements MigrationInterface
{
  name =
    'AddManufacturingActualCostContracts1788110000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "production_orders"
      ADD COLUMN IF NOT EXISTS
        "actual_material_cost"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      ADD COLUMN IF NOT EXISTS
        "actual_labor_cost"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      ADD COLUMN IF NOT EXISTS
        "actual_overhead_cost"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      ADD COLUMN IF NOT EXISTS
        "actual_total_cost"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "production_variances"
      ADD COLUMN IF NOT EXISTS
        "total_variance"
      numeric(18,2)
      NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_production_orders_actual_material_cost'
        ) THEN
          ALTER TABLE "production_orders"
          ADD CONSTRAINT
            "CHK_production_orders_actual_material_cost"
          CHECK (
            "actual_material_cost" >= 0
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_production_orders_actual_labor_cost'
        ) THEN
          ALTER TABLE "production_orders"
          ADD CONSTRAINT
            "CHK_production_orders_actual_labor_cost"
          CHECK (
            "actual_labor_cost" >= 0
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_production_orders_actual_overhead_cost'
        ) THEN
          ALTER TABLE "production_orders"
          ADD CONSTRAINT
            "CHK_production_orders_actual_overhead_cost"
          CHECK (
            "actual_overhead_cost" >= 0
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'CHK_production_orders_actual_total_cost'
        ) THEN
          ALTER TABLE "production_orders"
          ADD CONSTRAINT
            "CHK_production_orders_actual_total_cost"
          CHECK (
            "actual_total_cost" >= 0
          );
        END IF;
      END
      $$;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP CONSTRAINT IF EXISTS
        "CHK_production_orders_actual_total_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP CONSTRAINT IF EXISTS
        "CHK_production_orders_actual_overhead_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP CONSTRAINT IF EXISTS
        "CHK_production_orders_actual_labor_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP CONSTRAINT IF EXISTS
        "CHK_production_orders_actual_material_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_variances"
      DROP COLUMN IF EXISTS
        "total_variance"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP COLUMN IF EXISTS
        "actual_total_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP COLUMN IF EXISTS
        "actual_overhead_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP COLUMN IF EXISTS
        "actual_labor_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "production_orders"
      DROP COLUMN IF EXISTS
        "actual_material_cost"
    `);
  }
}
