import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNegativeInventoryPolicies1787611000000 implements MigrationInterface {
  name = 'CreateNegativeInventoryPolicies1787611000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "negative_inventory_policies_mode_enum" AS ENUM('block', 'allow', 'allow_with_limit')`);
    await queryRunner.query(`
      CREATE TABLE "negative_inventory_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "warehouseId" uuid,
        "itemId" uuid,
        "mode" "negative_inventory_policies_mode_enum" NOT NULL,
        "maxNegativeQuantity" numeric(18,6),
        "isActive" boolean NOT NULL DEFAULT true,
        "notes" character varying(500),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_negative_inventory_policies" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_negative_inventory_item_requires_warehouse" CHECK ("itemId" IS NULL OR "warehouseId" IS NOT NULL),
        CONSTRAINT "CHK_negative_inventory_limit" CHECK (
          ("mode" = 'allow_with_limit' AND "maxNegativeQuantity" IS NOT NULL AND "maxNegativeQuantity" >= 0)
          OR ("mode" <> 'allow_with_limit' AND "maxNegativeQuantity" IS NULL)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_negative_inventory_policy_company" ON "negative_inventory_policies" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_negative_inventory_policy_scope" ON "negative_inventory_policies" ("companyId", "warehouseId", "itemId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_negative_inventory_company_default" ON "negative_inventory_policies" ("companyId") WHERE "warehouseId" IS NULL AND "itemId" IS NULL AND "deletedAt" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_negative_inventory_warehouse" ON "negative_inventory_policies" ("companyId", "warehouseId") WHERE "warehouseId" IS NOT NULL AND "itemId" IS NULL AND "deletedAt" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_negative_inventory_item_warehouse" ON "negative_inventory_policies" ("companyId", "warehouseId", "itemId") WHERE "warehouseId" IS NOT NULL AND "itemId" IS NOT NULL AND "deletedAt" IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "negative_inventory_policies"`);
    await queryRunner.query(`DROP TYPE "negative_inventory_policies_mode_enum"`);
  }
}
