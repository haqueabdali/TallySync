# Production Orders integration

Copy `src/production-orders` into the backend source tree.

Copy `migration/1762448400000-CreateProductionOrders.ts` into `src/database/migrations`.

Register `ProductionOrdersModule` in `AppModule`:

```ts
import { ProductionOrdersModule } from './production-orders/production-orders.module';
```

Register `ProductionOrderEntity` and `ProductionOrderComponentEntity` in the CLI DataSource entities array.

This module snapshots active BOM component requirements. It does not issue inventory or receive finished goods. Those operations belong to the next Material Consumption and Finished Goods modules.
