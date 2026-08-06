# Bill of Materials integration

Copy this folder to `src/bill-of-materials`.

1. Add `BillOfMaterialsModule` to `AppModule`.
2. Add `BillOfMaterialEntity` and `BillOfMaterialComponentEntity` to the CLI DataSource entity list.
3. Copy the migration file from this package into `src/database/migrations` and run migrations.

The module uses `src/inventory/entities/item.entity.ts` as the canonical item model.
