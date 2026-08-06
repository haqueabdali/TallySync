# FIFO Costing

Warehouse-level perpetual FIFO costing built on the existing inventory cost balance and transaction entities.

## Installation

Copy this folder to:

`src/inventory-cost-engine/fifo`

Register these two entities in the main TypeORM DataSource entity list:

- `FifoCostLayerEntity`
- `FifoCostAllocationEntity`

Register the included migration in the project migration list and run it.

Import `FifoCostingModule` into each document module that posts inventory, or import it once into the existing Inventory Cost Engine module and re-export `FifoCostingService`.

## Document integration

- Opening Balance, Goods Receipt, Sales Return, positive stock adjustment: `recordReceipt()`
- Delivery Note, Purchase Return, negative stock adjustment: `recordIssue()`

Always pass the existing document transaction manager:

```ts
await fifoCostingService.recordReceipt(input, { manager });
```

This keeps document posting, inventory costing, and accounting atomic.

## Behavior

- Receipt creates one immutable FIFO cost layer.
- Issue locks and consumes the oldest open layers by received date, creation time, then UUID.
- One aggregate inventory cost transaction is created per source line.
- Detailed layer consumption is stored in `fifo_cost_allocations`.
- Repeated calls for the same source line return the existing cost transaction.
- Negative stock is rejected.

## Landed cost

Landed cost revaluation requires allocating additional value across open FIFO layers without changing quantity. The existing inventory cost transaction entity requires a quantity and is not yet suitable for value-only adjustments. Do not call `recordReceipt()` for landed cost.
