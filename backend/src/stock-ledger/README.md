# Stock Ledger installation

Copy this folder to:

`src/stock-ledger`

Then update `src/app.module.ts`:

```ts
import { StockLedgerModule } from './stock-ledger/stock-ledger.module';
```

Add `StockLedgerModule` to the `imports` array.

No migration or new entity registration is required. The module reads the existing immutable `inventory_cost_transactions` table.

Endpoints:

- `GET /stock-ledger`
- `GET /stock-ledger/summary`

Filters:

- `itemId`
- `warehouseId`
- `fromDate`
- `toDate`
- `sourceType`
- `transactionType`
- `page`
- `limit`
- `oldestFirst`
