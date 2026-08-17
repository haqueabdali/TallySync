# Manufacturing Accounting / WIP Development Plan

Do not wire manufacturing journals until the readiness report proves the
account mappings and source-document contracts exist.

## Target accounting model

### 1. Material issue / consumption

```text
Work In Progress           Dr
Raw Materials Inventory    Cr
```

Amount:

```text
actual inventory valuation of consumed material
```

Not:

```text
selling price
purchase invoice price copied blindly
current sales price
```

The Inventory Cost Engine should supply the consumed cost.

---

### 2. Labor applied to production

When/if labor capture is implemented:

```text
Work In Progress           Dr
Direct Labor / Payroll     Cr
```

The credit-side account depends on your payroll/accrual integration.

---

### 3. Manufacturing overhead

When overhead is applied:

```text
Work In Progress                Dr
Manufacturing Overhead Applied  Cr
```

Do not mix overhead into material cost invisibly.

---

### 4. Finished goods completion

At completed actual cost:

```text
Finished Goods Inventory    Dr
Work In Progress            Cr
```

The amount should equal the capitalizable manufacturing cost transferred out of
WIP.

---

### 5. Variance settlement

Example unfavorable variance:

```text
Manufacturing Variance      Dr
Work In Progress            Cr
```

For favorable variance the direction reverses.

The exact policy depends on whether your costing model closes variance at order
completion or period close.

---

## Required accounting settings

Prefer nullable UUID mappings such as:

```text
rawMaterialsInventoryAccountId
workInProgressAccountId
finishedGoodsInventoryAccountId
manufacturingVarianceAccountId
directLaborAccountId
manufacturingOverheadAccountId
```

Add configurable switches only if operationally useful:

```text
autoPostMaterialConsumption
autoPostProductionCompletion
autoPostProductionVariance
```

Do not hard-code account IDs in posting rules.

---

## Source-document idempotency

Use explicit journal source types:

```text
material_consumption
production_completion
production_variance
```

Every source document must produce at most one live journal.

Your existing unique source-journal index should enforce:

```text
company_id + source_type + source_id
```

under concurrent requests.

---

## Transaction boundary

Operational transaction:

```text
stock mutation
production status
consumption / completion document
commit
```

Then:

```text
AccountingEngineService.post...
```

outside that business transaction.

If accounting fails after the operational transaction commits, retrying the
same POST endpoint should:

```text
not mutate stock again
not complete again
retry only accounting
```

This is the same recovery pattern already used on purchase-side posting.

---

## Reversal

Cancellation/reversal of a posted manufacturing source must reverse BOTH:

```text
operational state
accounting journal
```

Never restore stock but leave the original manufacturing journal active.

---

## E2E reconciliation target

For one production order:

```text
Raw material opening value      1,000
Material consumed                 100
FG produced actual cost           100
```

Expected:

```text
Raw Material Inventory       -100
WIP material issue           +100
WIP completion               -100
Finished Goods Inventory     +100
Net WIP                         0
```

If labor/overhead are included:

```text
Material       100
Labor           20
Overhead        10
Total FG       130
```

Expected finished-goods debit:

```text
130
```

Variance must reconcile expected vs actual cost without leaving an unexplained
WIP balance.
