# Finished Goods integration

Copy `src/finished-goods` into the backend and copy the migration into `src/database/migrations`.

AppModule:

```ts
import { FinishedGoodsModule } from './finished-goods/finished-goods.module';
```

Add `FinishedGoodsModule` to `imports`.

CLI DataSource:

```ts
import { FinishedGoodsReceiptEntity } from '../finished-goods/entities/finished-goods-receipt.entity';
```

Add `FinishedGoodsReceiptEntity` to the DataSource `entities` array.

The module uses `InventoryCostSourceType.STOCK_ADJUSTMENT` because the current enum has no manufacturing receipt member. It calculates finished-goods cost from posted material-consumption line cost only; labor and overhead are not invented.
