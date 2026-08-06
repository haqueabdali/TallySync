# Manufacturing MRP foundation

Install at `src/manufacturing-mrp`.

Add to `src/app.module.ts`:

```ts
import { ManufacturingMrpModule } from './manufacturing-mrp/manufacturing-mrp.module';
```

Then add `ManufacturingMrpModule` to the AppModule imports array.

Endpoint:

`GET /manufacturing/mrp/plan`

This foundation uses only existing fields:

- `ItemEntity.reorderLevel`
- `InventoryCostBalanceEntity.quantity`
- `InventoryCostBalanceEntity.averageUnitCost`
- existing item and warehouse identity fields

It does not invent BOM, demand, lead-time, safety-stock, scheduled-receipt, or production-order fields. Production recommendations will be added after the Bill of Materials and Production Orders modules are implemented.

No migration is required.
