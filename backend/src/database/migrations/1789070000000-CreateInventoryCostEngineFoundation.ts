import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryCostEngineFoundation1789070000000
  implements MigrationInterface
{
  name = 'CreateInventoryCostEngineFoundation1789070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "inventory_cost_transaction_type_enum" AS ENUM (
          'receipt',
          'issue',
          'adjustment_in',
          'adjustment_out',
          'landed_cost',
          'reversal'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "inventory_cost_source_type_enum" AS ENUM (
          'opening_balance',
          'goods_receipt',
          'delivery_note',
          'purchase_return',
          'sales_return',
          'landed_cost',
          'stock_adjustment',
          'production_completion'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_cost_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,

        "quantity" numeric(18,4) NOT NULL DEFAULT 0,
        "average_unit_cost" numeric(18,6) NOT NULL DEFAULT 0,
        "inventory_value" numeric(18,4) NOT NULL DEFAULT 0,

        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_inventory_cost_balances"
          PRIMARY KEY ("id"),

        CONSTRAINT "FK_inventory_cost_balances_company"
          FOREIGN KEY ("company_id")
          REFERENCES "companies"("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_inventory_cost_balances_item"
          FOREIGN KEY ("item_id")
          REFERENCES "items"("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_inventory_cost_balances_warehouse"
          FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses"("id")
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_inventory_cost_balances_company_item_warehouse"
      ON "inventory_cost_balances"
        ("company_id", "item_id", "warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_inventory_cost_balances_company"
      ON "inventory_cost_balances" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_inventory_cost_balances_item"
      ON "inventory_cost_balances" ("item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_inventory_cost_balances_warehouse"
      ON "inventory_cost_balances" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_cost_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),

        "company_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,

        "transaction_date" date NOT NULL,

        "transaction_type"
          "inventory_cost_transaction_type_enum" NOT NULL,

        "source_type"
          "inventory_cost_source_type_enum" NOT NULL,

        "source_id" uuid NOT NULL,
        "source_line_id" uuid NOT NULL,

        "quantity" numeric(18,4) NOT NULL,
        "unit_cost" numeric(18,6) NOT NULL,
        "total_cost" numeric(18,4) NOT NULL,

        "quantity_after" numeric(18,4) NOT NULL,
        "average_unit_cost_after" numeric(18,6) NOT NULL,
        "inventory_value_after" numeric(18,4) NOT NULL,

        "created_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_inventory_cost_transactions"
          PRIMARY KEY ("id"),

        CONSTRAINT "FK_inventory_cost_transactions_company"
          FOREIGN KEY ("company_id")
          REFERENCES "companies"("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_inventory_cost_transactions_item"
          FOREIGN KEY ("item_id")
          REFERENCES "items"("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_inventory_cost_transactions_warehouse"
          FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses"("id")
          ON DELETE RESTRICT,

        CONSTRAINT "FK_inventory_cost_transactions_created_by"
          FOREIGN KEY ("created_by")
          REFERENCES "users"("id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_inventory_cost_transactions_company_date"
      ON "inventory_cost_transactions"
        ("company_id", "transaction_date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_inventory_cost_transactions_item_warehouse"
      ON "inventory_cost_transactions"
        ("item_id", "warehouse_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_inventory_cost_transactions_source_line"
      ON "inventory_cost_transactions" (
        "company_id",
        "source_type",
        "source_id",
        "source_line_id",
        "transaction_type"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "inventory_cost_transactions"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "inventory_cost_balances"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "inventory_cost_source_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "inventory_cost_transaction_type_enum"
    `);
  }
}
