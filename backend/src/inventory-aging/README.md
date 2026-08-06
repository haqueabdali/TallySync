# Inventory Aging

Install this folder at:

`src/inventory-aging`

Add to `src/app.module.ts`:

```ts
import { InventoryAgingModule } from './inventory-aging/inventory-aging.module';
```

Then add `InventoryAgingModule` to the `imports` array.

Endpoint:

`GET /inventory-aging`

Optional query parameters: `itemId`, `warehouseId`, `asOfDate`, `page`, `limit`.

The report reconstructs remaining FIFO receipt layers from the existing immutable
`inventory_cost_transactions` data and groups the remaining quantity/value into:
0-30, 31-60, 61-90, 91-180, 181-365, and over-365-day buckets.

No database table or migration is added.
