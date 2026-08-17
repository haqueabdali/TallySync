# Manufacturing Accounting E2E — Completion Plan

## Add package.json scripts

```json
"audit:manufacturing:accounting-e2e": "ts-node -r tsconfig-paths/register scripts/audit/manufacturing-accounting-e2e-readiness.ts",
"test:e2e:manufacturing-accounting": "jest --config ./test/jest-e2e.json manufacturing-accounting.e2e-spec.ts --runInBand"
```

## Important fixture rule

Do not create a completely separate manufacturing domain fixture if
`manufacturing.e2e-spec.ts` already creates:

```text
company
raw material
finished item
BOM
production order
material consumption
production variance
```

Prefer extracting a shared manufacturing E2E fixture helper so both tests use
the same lifecycle.

## Accounting settings required in the fixture

Create/postable accounts for:

```text
Raw Materials Inventory
Work In Progress
Finished Goods Inventory
Manufacturing Variance
```

Then update Accounting Settings with:

```text
rawMaterialsInventoryAccountId
workInProgressAccountId
finishedGoodsInventoryAccountId
manufacturingVarianceAccountId

autoPostMaterialConsumption = true
autoPostProductionCompletion = true
autoPostProductionVariance = true
```

## Controlled reconciliation example

```text
Actual material cost     80
Actual labor cost         0
Actual overhead cost      0
Actual total cost        80
Expected total cost      75
Total variance           +5
```

Source journals:

```text
Material Consumption
WIP                    Dr 80
Raw Materials          Cr 80

Production Completion
Finished Goods         Dr 80
WIP                    Cr 80

Production Variance
Manufacturing Variance Dr 5
WIP                    Cr 5
```

Note: the simple example above produces a WIP credit residual of 5 if the
completion already transfers full actual cost. This means your accounting
policy must be internally consistent.

Choose ONE policy:

### Policy A — completion at actual cost

```text
FG Dr actual total cost
WIP Cr actual total cost
```

Then variance is analysis-only or posted against another control/standard-cost
account, NOT WIP again.

### Policy B — completion at standard cost

```text
FG Dr standard cost
WIP Cr standard cost
```

Then:

```text
variance settles the difference between actual WIP and standard FG transfer
```

For clean manufacturing accounting, **Policy B is normally the better model
when you intend to post manufacturing variance separately**.

Do not mark WIP reconciliation green until this policy is explicit.

## Recommended next correction

If ProductionCompletionPostingRule currently credits WIP using
`actualTotalCost` AND ProductionVariancePostingRule also posts against WIP,
you risk double-settling WIP.

Before final E2E, decide whether:

```text
Production Completion uses actual cost
and variance is non-GL / analytical

OR

Production Completion uses expected/standard cost
and Production Variance closes the difference
```

The second option gives a clearer three-stage manufacturing accounting flow.
