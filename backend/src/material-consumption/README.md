# Material Consumption

Install at `src/material-consumption`.

The module posts component issues through the existing moving-average costing engine in the same TypeORM transaction that updates production-order component consumption.

## Required registration

- Import `MaterialConsumptionModule` in `AppModule`.
- Register `MaterialConsumptionEntity` and `MaterialConsumptionLineEntity` in the CLI DataSource.
- Copy the migration to `src/database/migrations` and run it.

The existing `InventoryCostSourceType.STOCK_ADJUSTMENT` is used because the current enum has no manufacturing-specific source member. The dedicated material-consumption tables retain the production-order audit trail.
