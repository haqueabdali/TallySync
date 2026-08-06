# Inventory Valuation

Copy this folder to:

```text
src/inventory-valuation
```

Add to `src/app.module.ts`:

```ts
import { InventoryValuationModule } from './inventory-valuation/inventory-valuation.module';
```

Then add `InventoryValuationModule` to the `imports` array.

## Endpoint

```http
GET /inventory-valuation
```

Query parameters:

- `itemId`
- `warehouseId`
- `asOfDate` (`YYYY-MM-DD`)
- `includeZeroQuantity`
- `page`
- `limit`

When `asOfDate` is omitted, valuation reads `inventory_cost_balances`.
When supplied, valuation reconstructs the balance from immutable `inventory_cost_transactions` through the end of that date.

No new entity or migration is required.
