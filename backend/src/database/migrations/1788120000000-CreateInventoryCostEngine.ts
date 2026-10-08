import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the inventory cost engine schema.
 *
 * The moving-average engine (used by material consumption and finished-goods
 * receipts) and the FIFO engine had entities and services but no migration in
 * the migration directory, so a migrated database lacked these tables and
 * every manufacturing stock movement failed with "relation does not exist".
 * The FIFO migration previously sat unregistered inside the FIFO module.
 */
export class CreateInventoryCostEngine1788120000000 implements MigrationInterface {
  name = 'CreateInventoryCostEngine1788120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_cost_source_type_enum') THEN
          CREATE TYPE "inventory_cost_source_type_enum" AS ENUM (
            'opening_balance', 'goods_receipt', 'delivery_note', 'purchase_return',
            'sales_return', 'landed_cost', 'stock_adjustment', 'production_completion'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_cost_transaction_type_enum') THEN
          CREATE TYPE "inventory_cost_transaction_type_enum" AS ENUM (
            'receipt', 'issue', 'adjustment_in', 'adjustment_out', 'landed_cost', 'reversal'
          );
        END IF;
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
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_cost_balances" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_inventory_cost_balances_non_negative" CHECK (
          "quantity" >= 0 AND "average_unit_cost" >= 0 AND "inventory_value" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inventory_cost_balances_company_item_warehouse" ON "inventory_cost_balances" ("company_id", "item_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_cost_balances_company" ON "inventory_cost_balances" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_cost_balances_item" ON "inventory_cost_balances" ("item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_cost_balances_warehouse" ON "inventory_cost_balances" ("warehouse_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_cost_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "transaction_date" date NOT NULL,
        "transaction_type" "inventory_cost_transaction_type_enum" NOT NULL,
        "source_type" "inventory_cost_source_type_enum" NOT NULL,
        "source_id" uuid NOT NULL,
        "source_line_id" uuid NOT NULL,
        "quantity" numeric(18,4) NOT NULL,
        "unit_cost" numeric(18,6) NOT NULL,
        "total_cost" numeric(18,4) NOT NULL,
        "quantity_after" numeric(18,4) NOT NULL,
        "average_unit_cost_after" numeric(18,6) NOT NULL,
        "inventory_value_after" numeric(18,4) NOT NULL,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_cost_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_cost_transactions_company_date" ON "inventory_cost_transactions" ("company_id", "transaction_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inventory_cost_transactions_item_warehouse" ON "inventory_cost_transactions" ("item_id", "warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_inventory_cost_transactions_source_line" ON "inventory_cost_transactions" ("company_id", "source_type", "source_id", "source_line_id", "transaction_type")`,
    );

    // FIFO layers and allocations (relocated from the unregistered FIFO module migration).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fifo_cost_layers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "received_date" date NOT NULL,
        "source_type" "inventory_cost_source_type_enum" NOT NULL,
        "source_id" uuid NOT NULL,
        "source_line_id" uuid NOT NULL,
        "original_quantity" numeric(18,4) NOT NULL,
        "remaining_quantity" numeric(18,4) NOT NULL,
        "unit_cost" numeric(18,6) NOT NULL,
        "original_value" numeric(18,4) NOT NULL,
        "remaining_value" numeric(18,4) NOT NULL,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fifo_cost_layers" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_fifo_cost_layers_quantities" CHECK (
          "original_quantity" > 0
          AND "remaining_quantity" >= 0
          AND "remaining_quantity" <= "original_quantity"
        ),
        CONSTRAINT "CHK_fifo_cost_layers_costs" CHECK (
          "unit_cost" >= 0
          AND "original_value" >= 0
          AND "remaining_value" >= 0
          AND "remaining_value" <= "original_value"
        )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fifo_cost_layers_source_line"
      ON "fifo_cost_layers" (
        "company_id", "source_type", "source_id", "source_line_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fifo_cost_layers_lookup"
      ON "fifo_cost_layers" (
        "company_id", "item_id", "warehouse_id",
        "remaining_quantity", "received_date"
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fifo_cost_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "cost_layer_id" uuid NOT NULL,
        "issue_source_type" "inventory_cost_source_type_enum" NOT NULL,
        "issue_source_id" uuid NOT NULL,
        "issue_source_line_id" uuid NOT NULL,
        "quantity" numeric(18,4) NOT NULL,
        "unit_cost" numeric(18,6) NOT NULL,
        "total_cost" numeric(18,4) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fifo_cost_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fifo_cost_allocations_layer"
          FOREIGN KEY ("cost_layer_id")
          REFERENCES "fifo_cost_layers"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "CHK_fifo_cost_allocations_values" CHECK (
          "quantity" > 0 AND "unit_cost" >= 0 AND "total_cost" >= 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fifo_cost_allocations_issue_layer"
      ON "fifo_cost_allocations" (
        "company_id", "issue_source_type", "issue_source_id",
        "issue_source_line_id", "cost_layer_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fifo_cost_allocations_issue"
      ON "fifo_cost_allocations" (
        "company_id", "issue_source_type",
        "issue_source_id", "issue_source_line_id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "fifo_cost_allocations"');
    await queryRunner.query('DROP TABLE IF EXISTS "fifo_cost_layers"');
    await queryRunner.query(
      'DROP TABLE IF EXISTS "inventory_cost_transactions"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "inventory_cost_balances"');
    await queryRunner.query(
      'DROP TYPE IF EXISTS "inventory_cost_transaction_type_enum"',
    );
    await queryRunner.query(
      'DROP TYPE IF EXISTS "inventory_cost_source_type_enum"',
    );
  }
}
