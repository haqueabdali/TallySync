# Manufacturing Order-to-Completion — Development Plan

This is the next integrated ERP milestone after the commercial / returns core.

Do not regenerate the existing manufacturing modules. Use the current files and
apply only the missing lifecycle, inventory, costing, and E2E changes uncovered
by the readiness audit.

---

## 1. Canonical business flow

The target workflow is:

```text
Raw Material Item(s)
        ↓
Finished Good Item
        ↓
Bill of Materials
        ↓
Production Order
        ↓
MRP / component requirement
        ↓
Production start
        ↓
Material Consumption
        ↓
Raw-material stock decreases
        ↓
Production completion
        ↓
Finished-goods stock increases
        ↓
Actual production cost
        ↓
Production variance
        ↓
Inventory / GL reconciliation
```

This must use the SAME `items.current_stock` contract already used by
Procure-to-Pay and Purchase Returns.

---

## 2. Do not introduce another inventory model

Before changing any manufacturing service, inspect:

```text
src/inventory/entities/item.entity.ts
```

Manufacturing must use:

```ts
item.currentStock
```

Do not add:

```text
stockQty
currentQty
onHand
quantityOnHand
```

as parallel stock truth.

If a legacy manufacturing service currently uses one of those names, replace
the access with the existing ItemEntity field rather than modifying ItemEntity
to support both contracts.

---

## 3. BOM invariants

`BillOfMaterialsService` must enforce:

```text
company isolation
finished good exists
every component item exists
finished good cannot be its own component
component quantity > 0
base output quantity > 0
duplicate component item prohibited
only one active/default BOM per finished item where your design requires it
```

For a BOM that makes one finished item from:

```text
2 × Raw Material A
3 × Raw Material B
```

a production order for 10 finished units must require:

```text
20 × A
30 × B
```

before scrap/yield adjustment.

Add a dedicated calculator unit test if this expansion logic is currently
embedded only in a service.

---

## 4. Production Order lifecycle

Use explicit state transitions instead of allowing arbitrary status writes.

Recommended lifecycle:

```text
Draft
  ↓ release/confirm
Released
  ↓ start
InProgress
  ↓ complete
Completed

Draft / Released
  ↓ cancel
Cancelled
```

Reject:

```text
Completed → start
Cancelled → start
Cancelled → complete
Completed → complete again with inventory mutation
```

Completion MUST be retry-safe:

```text
already Completed
→ return existing production order
→ do not consume again
→ do not increase finished stock again
```

---

## 5. MRP validation

MRP is planning, not stock mutation.

Given:

```text
Required component = 20
Available stock    = 12
```

MRP shortage must be:

```text
8
```

It must NOT:

```text
decrease currentStock
create inventory movements
complete a production order
```

Add an E2E assertion that running MRP twice leaves inventory unchanged.

---

## 6. Material Consumption transaction

Material consumption must be atomic.

Inside ONE `DataSource.transaction()`:

```text
lock / reload Production Order
validate InProgress / Released policy
load component item(s)
check available currentStock
decrease currentStock
persist consumption header
persist consumption lines
update issued/consumed component quantities
commit
```

If any component is short:

```text
rollback all component stock changes
rollback consumption document
```

Never let:

```text
Raw Material A decrement
Raw Material B insufficient
transaction fails
Raw Material A remains decremented
```

---

## 7. Concurrency protection

For every stock mutation in manufacturing, use one of:

```ts
pessimistic_write
```

or an atomic guarded update such as:

```sql
UPDATE items
SET current_stock =
  current_stock - :qty
WHERE id = :itemId
  AND company_id = :companyId
  AND current_stock >= :qty
```

and assert `affected === 1`.

Without this, two simultaneous material-consumption calls can both pass a
read-time stock check.

---

## 8. Production completion

Completion should happen inside a transaction.

Required behavior:

```text
load production order
validate status
validate completed quantity
validate material-consumption policy
load finished ItemEntity
increase finishedItem.currentStock
set actual/completed quantity
set completion timestamp
set Completed
save
commit
```

The stock change must occur only once.

### Partial completion

If your current domain supports partial completion, track:

```text
plannedQuantity
completedQuantity
remainingQuantity
```

and increase stock only by the delta being completed.

If partial completion is NOT intentionally supported, reject a completion
quantity that differs from the production-order quantity.

Do not accidentally support partial completion through loosely validated DTOs.

---

## 9. Cost capture

A completed order should expose at least:

```text
actualMaterialCost
actualLaborCost
actualOverheadCost
actualTotalCost
actualUnitCost
```

Material cost should be based on the actual consumption valuation used by the
Inventory Cost Engine, not the current selling price.

Expected:

```text
actualTotalCost =
  actualMaterialCost
+ actualLaborCost
+ actualOverheadCost

actualUnitCost =
  actualTotalCost
/ completedQuantity
```

Protect against division by zero.

---

## 10. Production variance

After completion calculate:

```text
Material price / usage variance
Labor variance
Overhead variance
Total production variance
```

At minimum:

```text
Total variance =
  Actual production cost
- Standard / expected production cost
```

Run variance twice and verify it is deterministic rather than creating
duplicate analysis records unless versioning is explicitly intended.

---

## 11. Accounting integration boundary

Do NOT automatically invent manufacturing GL posting rules until the existing
account configuration is inspected.

First validate whether your current Accounting Settings already define:

```text
Raw Materials Inventory
Work In Progress
Finished Goods Inventory
Manufacturing Variance
Direct Labor
Manufacturing Overhead
```

If not, the safe next phase is:

```text
operational manufacturing E2E first
then manufacturing accounting settings + posting rules
```

Recommended eventual postings:

### Material issue

```text
Work In Progress        Dr
Raw Materials Inventory Cr
```

### Production completion

```text
Finished Goods Inventory Dr
Work In Progress          Cr
```

### Production variance

```text
Manufacturing Variance Dr/Cr
Work In Progress       balancing side
```

Do not hardcode account IDs.

---

## 12. Dedicated E2E

Add:

```text
test/manufacturing.e2e-spec.ts
```

The first manufacturing E2E should be deliberately small:

```text
Raw Material A currentStock = 100
Finished Good currentStock  = 0

BOM:
  output quantity = 1
  component A = 2

Production Order:
  quantity = 5

Expected component requirement:
  A = 10
```

Then test:

```text
create/release production order
run MRP
MRP says required A=10
stock A still 100
start order
consume A=10
stock A becomes 90
complete order for 5
finished good becomes 5
repeat completion
finished good remains 5
raw material remains 90
production status remains Completed
calculate variance
actual unit cost finite/non-negative
```

---

## 13. Insufficient-stock rollback scenario

Create a second test:

```text
Raw A stock = 5
Raw B stock = 100

BOM requires:
  A = 10
  B = 10
```

Attempt consumption.

Expected:

```text
HTTP 400/409
A remains 5
B remains 100
no posted consumption document
production order not Completed
```

This is one of the most important manufacturing integrity tests.

---

## 14. Cross-company isolation scenario

Create:

```text
Company A production order
Company B raw material
```

Attempt to attach or consume Company B item from Company A production order.

Expected:

```text
404/400
no inventory mutation
```

---

## 15. package.json

Add:

```json
"audit:manufacturing": "ts-node -r tsconfig-paths/register scripts/audit-manufacturing-readiness.ts",
"test:e2e:manufacturing": "jest --config ./test/jest-e2e.json manufacturing.e2e-spec.ts --runInBand"
```

---

## 16. Validation order

```bash
rm -rf dist
npm run build

npm run audit:security
npm run audit:returns-readiness
npm run audit:manufacturing

export E2E_DATABASE_NAME=tallysync_e2e_test

npm run audit:entity-schema
npm run audit:accounting-idempotency

npm test -- --runInBand

npm run test:e2e:business
npm run test:e2e:procure
npm run test:e2e:manufacturing
```

Do not move manufacturing to GREEN until the dedicated E2E passes against a
fresh migrated PostgreSQL database.
