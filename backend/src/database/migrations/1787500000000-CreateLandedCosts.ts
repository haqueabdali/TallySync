import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLandedCosts1787500000000
  implements MigrationInterface
{
  name = 'CreateLandedCosts1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'landed_costs_status_enum'
        ) THEN
          CREATE TYPE "public"."landed_costs_status_enum"
          AS ENUM ('Draft', 'Posted', 'Cancelled');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'landed_costs_allocation_method_enum'
        ) THEN
          CREATE TYPE
            "public"."landed_costs_allocation_method_enum"
          AS ENUM (
            'ByQuantity',
            'ByValue',
            'ByWeight',
            'Equal'
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
          FROM pg_type
          WHERE typname = 'landed_cost_charges_cost_type_enum'
        ) THEN
          CREATE TYPE
            "public"."landed_cost_charges_cost_type_enum"
          AS ENUM (
            'Freight',
            'CustomsDuty',
            'Insurance',
            'Handling',
            'PortCharge',
            'ClearingCharge',
            'Transport',
            'Other'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "landed_costs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "goods_receipt_id" uuid,
        "purchase_invoice_id" uuid,
        "landed_cost_number" character varying(50) NOT NULL,
        "cost_date" date NOT NULL,
        "status"
          "public"."landed_costs_status_enum"
          NOT NULL DEFAULT 'Draft',
        "allocation_method"
          "public"."landed_costs_allocation_method_enum"
          NOT NULL DEFAULT 'ByValue',
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "total_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "posted_by" uuid,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_by" uuid,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE
          NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_landed_costs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_landed_costs_total_cost"
          CHECK ("total_cost" >= 0),
        CONSTRAINT "CHK_landed_costs_source"
          CHECK (
            "goods_receipt_id" IS NOT NULL
            OR "purchase_invoice_id" IS NOT NULL
          )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "landed_cost_charges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "landed_cost_id" uuid NOT NULL,
        "cost_type"
          "public"."landed_cost_charges_cost_type_enum"
          NOT NULL,
        "supplier_id" uuid,
        "reference_number" character varying(120),
        "amount" numeric(18,2) NOT NULL,
        "description" text,
        CONSTRAINT "PK_landed_cost_charges"
          PRIMARY KEY ("id"),
        CONSTRAINT "CHK_landed_cost_charges_amount"
          CHECK ("amount" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS
        "landed_cost_item_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "landed_cost_id" uuid NOT NULL,
        "goods_receipt_item_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,4) NOT NULL,
        "base_value" numeric(18,2) NOT NULL DEFAULT 0,
        "weight_value" numeric(18,4) NOT NULL DEFAULT 0,
        "allocation_basis" numeric(18,4) NOT NULL DEFAULT 0,
        "allocated_cost" numeric(18,2) NOT NULL DEFAULT 0,
        "landed_unit_cost" numeric(18,4) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_landed_cost_item_allocations"
          PRIMARY KEY ("id"),
        CONSTRAINT "CHK_landed_cost_item_allocations_quantity"
          CHECK ("quantity" > 0),
        CONSTRAINT "CHK_landed_cost_item_allocations_values"
          CHECK (
            "base_value" >= 0
            AND "weight_value" >= 0
            AND "allocation_basis" >= 0
            AND "allocated_cost" >= 0
            AND "landed_unit_cost" >= 0
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_costs_company"
      ON "landed_costs" ("company_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_costs_goods_receipt"
      ON "landed_costs" ("goods_receipt_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_costs_purchase_invoice"
      ON "landed_costs" ("purchase_invoice_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_costs_status"
      ON "landed_costs" ("company_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_landed_costs_company_number"
      ON "landed_costs"
        ("company_id", "landed_cost_number")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_cost_charges_landed_cost"
      ON "landed_cost_charges" ("landed_cost_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_cost_item_allocations_landed_cost"
      ON "landed_cost_item_allocations" ("landed_cost_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS
        "IDX_landed_cost_item_allocations_item"
      ON "landed_cost_item_allocations" ("item_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_landed_cost_item_allocation_source"
      ON "landed_cost_item_allocations"
        ("landed_cost_id", "goods_receipt_item_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_landed_costs_goods_receipt'
        ) THEN
          ALTER TABLE "landed_costs"
          ADD CONSTRAINT "FK_landed_costs_goods_receipt"
          FOREIGN KEY ("goods_receipt_id")
          REFERENCES "goods_receipts"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_landed_costs_purchase_invoice'
        ) THEN
          ALTER TABLE "landed_costs"
          ADD CONSTRAINT "FK_landed_costs_purchase_invoice"
          FOREIGN KEY ("purchase_invoice_id")
          REFERENCES "purchase_invoices"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_landed_cost_charges_landed_cost'
        ) THEN
          ALTER TABLE "landed_cost_charges"
          ADD CONSTRAINT "FK_landed_cost_charges_landed_cost"
          FOREIGN KEY ("landed_cost_id")
          REFERENCES "landed_costs"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
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
          WHERE conname = 'FK_landed_cost_charges_supplier'
        ) THEN
          ALTER TABLE "landed_cost_charges"
          ADD CONSTRAINT "FK_landed_cost_charges_supplier"
          FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
            'FK_landed_cost_item_allocations_landed_cost'
        ) THEN
          ALTER TABLE "landed_cost_item_allocations"
          ADD CONSTRAINT
            "FK_landed_cost_item_allocations_landed_cost"
          FOREIGN KEY ("landed_cost_id")
          REFERENCES "landed_costs"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
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
            'FK_landed_cost_item_allocations_gr_item'
        ) THEN
          ALTER TABLE "landed_cost_item_allocations"
          ADD CONSTRAINT
            "FK_landed_cost_item_allocations_gr_item"
          FOREIGN KEY ("goods_receipt_item_id")
          REFERENCES "goods_receipt_items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
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
            'FK_landed_cost_item_allocations_item'
        ) THEN
          ALTER TABLE "landed_cost_item_allocations"
          ADD CONSTRAINT
            "FK_landed_cost_item_allocations_item"
          FOREIGN KEY ("item_id")
          REFERENCES "items"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS
        "landed_cost_item_allocations"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "landed_cost_charges"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "landed_costs"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."landed_cost_charges_cost_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."landed_costs_allocation_method_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS
        "public"."landed_costs_status_enum"
    `);
  }
}
