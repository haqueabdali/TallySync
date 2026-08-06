import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFifoCostingTables1785952800000
  implements MigrationInterface
{
  name = 'CreateFifoCostingTables1785952800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fifo_cost_layers" (
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
      CREATE UNIQUE INDEX "UQ_fifo_cost_layers_source_line"
      ON "fifo_cost_layers" (
        "company_id", "source_type", "source_id", "source_line_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fifo_cost_layers_lookup"
      ON "fifo_cost_layers" (
        "company_id", "item_id", "warehouse_id",
        "remaining_quantity", "received_date"
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "fifo_cost_allocations" (
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
      CREATE UNIQUE INDEX "UQ_fifo_cost_allocations_issue_layer"
      ON "fifo_cost_allocations" (
        "company_id", "issue_source_type", "issue_source_id",
        "issue_source_line_id", "cost_layer_id"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fifo_cost_allocations_issue"
      ON "fifo_cost_allocations" (
        "company_id", "issue_source_type",
        "issue_source_id", "issue_source_line_id"
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "fifo_cost_allocations"');
    await queryRunner.query('DROP TABLE "fifo_cost_layers"');
  }
}
