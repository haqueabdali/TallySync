# Manufacturing Cost Contract Fix

The posting-contract audit found exactly two missing contracts:

```text
ProductionOrder:
  no reliable completed actual-cost fields

ProductionVariance:
  no total variance amount
```

Material Consumption is already usable because the detected line contract contains:

```text
quantity
unitCost
totalCost
itemId
```

So do NOT change the generator.

## 1. ProductionOrder entity

Open:

```text
src/production-orders/entities/production-order.entity.ts
```

Add:

```ts
@Column({
  name: 'actual_material_cost',
  type: 'decimal',
  precision: 18,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
})
actualMaterialCost!: number;

@Column({
  name: 'actual_labor_cost',
  type: 'decimal',
  precision: 18,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
})
actualLaborCost!: number;

@Column({
  name: 'actual_overhead_cost',
  type: 'decimal',
  precision: 18,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
})
actualOverheadCost!: number;

@Column({
  name: 'actual_total_cost',
  type: 'decimal',
  precision: 18,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
})
actualTotalCost!: number;
```

Reuse the decimal transformer already used by the entity. Do not introduce a
second transformer.

## 2. Populate actual costs during completion

In the production-completion service, calculate actual material cost from the
POSTED material-consumption lines belonging to the production order.

Prefer:

```ts
const actualMaterialCost =
  this.round(
    postedConsumptionLines.reduce(
      (sum, line) =>
        sum +
        Number(line.totalCost),
      0,
    ),
  );
```

Do not recalculate from Item selling price or current purchase price.

If labor/overhead capture already exists, use the existing persisted values.

If labor/overhead capture does NOT exist yet:

```ts
const actualLaborCost = 0;
const actualOverheadCost = 0;
```

Then:

```ts
const actualTotalCost =
  this.round(
    actualMaterialCost +
      actualLaborCost +
      actualOverheadCost,
  );

productionOrder.actualMaterialCost =
  actualMaterialCost;

productionOrder.actualLaborCost =
  actualLaborCost;

productionOrder.actualOverheadCost =
  actualOverheadCost;

productionOrder.actualTotalCost =
  actualTotalCost;
```

Persist these in the SAME transaction that marks the order completed.

## 3. ProductionVariance entity

Open the active entity under:

```text
src/production-variance/entities/
```

Add:

```ts
@Column({
  name: 'total_variance',
  type: 'decimal',
  precision: 18,
  scale: 2,
  default: 0,
  transformer: decimalTransformer,
})
totalVariance!: number;
```

## 4. Calculate signed total variance

In the service/calculator that creates or recalculates ProductionVariance:

```ts
const actualTotalCost =
  Number(
    productionOrder.actualTotalCost,
  );

const expectedTotalCost =
  Number(
    expectedProductionCost,
  );

const totalVariance =
  this.round(
    actualTotalCost -
      expectedTotalCost,
  );

variance.totalVariance =
  totalVariance;
```

Sign convention:

```text
positive = unfavorable
negative = favorable
zero     = no variance
```

This matches the generated variance posting rule.

## 5. expectedProductionCost

Use the costing source that already exists in the project.

Preferred order:

```text
1. persisted standard production cost
2. BOM expected material + labor + overhead
3. existing CostingVariance / ProductionCostAnalysis result
```

Do NOT use selling price.

## 6. Prevent duplicate variance rows

If the domain expects one variance record per production order, update/recalculate
the existing row instead of inserting a new row on every run.

Example lookup:

```ts
const existing =
  await varianceRepository.findOne({
    where: {
      companyId,
      productionOrderId:
        productionOrder.id,
    },
  });
```

Keep versioning only if the current domain intentionally supports it.

## 7. DTOs / responses

Expose these as read-only/system-calculated values where appropriate:

```text
actualMaterialCost
actualLaborCost
actualOverheadCost
actualTotalCost
totalVariance
```

Do not add them to normal create/update DTOs unless manual override is explicitly
part of the business design.

## 8. Validate

```bash
rm -rf dist
npm run build

export E2E_DATABASE_NAME=tallysync_e2e_test

npm run audit:entity-schema
npm run audit:manufacturing:posting-contract
```

Expected:

```text
Manufacturing posting contract extracted.
Findings=0
```

Then run:

```bash
npm run generate:manufacturing:posting-rules
```

Expected three generated rule files.

After that, wire the rules into AccountingEngineModule/Service.
