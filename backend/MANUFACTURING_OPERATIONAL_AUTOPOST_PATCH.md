# Manufacturing Operational Auto-post Wiring

Apply this pattern to the CURRENT service methods identified by:

```bash
npm run audit:manufacturing:autopost
```

Do not rename working lifecycle methods just to match this guide.

---

# 1. Shared rule

For all three sources:

```text
business transaction
→ commits successfully
→ Accounting Engine call
```

Never:

```text
stock mutation
→ Accounting Engine call inside same transaction
→ accounting throws
→ transaction mixes operational and GL recovery
```

The Accounting Engine already has source-document idempotency, and the DB-level
unique source index protects concurrent duplicate journals.

---

# 2. Material Consumption

File:

```text
src/material-consumption/material-consumption.service.ts
```

Add dependencies:

```ts
@InjectRepository(AccountingSettingsEntity)
private readonly accountingSettingsRepository:
  Repository<AccountingSettingsEntity>,

private readonly accountingEngineService:
  AccountingEngineService,
```

After the material-consumption transaction commits:

```ts
const saved =
  await this.dataSource.transaction(
    async (manager) => {
      // EXISTING logic:
      // validate production order
      // validate stock
      // decrease raw-material currentStock
      // persist header + lines
      // mark Posted if that is your domain state
      return savedConsumption;
    },
  );

await this.autoPostAccountingIfEnabled(
  saved.id,
  companyId,
  userId,
);

return this.toResponse(saved);
```

Add helper:

```ts
private async autoPostAccountingIfEnabled(
  sourceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostMaterialConsumption !==
    false
  ) {
    await this.accountingEngineService
      .postMaterialConsumption(
        sourceId,
        companyId,
        userId,
      );
  }
}
```

## Retry-safe path

At the beginning of the posting method:

```ts
if (
  existing.status ===
  MaterialConsumptionStatus.POSTED
) {
  await this.autoPostAccountingIfEnabled(
    existing.id,
    companyId,
    userId,
  );

  return this.toResponse(existing);
}
```

Use the exact enum member already present in the project.

Do NOT decrement stock again on retry.

---

# 3. Production Completion

File:

```text
src/production-orders/production-orders.service.ts
```

Use the exact existing completion method.

After its transaction commits:

```ts
const completed =
  await this.dataSource.transaction(
    async (manager) => {
      // EXISTING:
      // lock/reload order
      // validate lifecycle
      // calculate actual costs
      // increase FG currentStock
      // set Completed
      // save
      return savedOrder;
    },
  );

await this.autoPostCompletionAccountingIfEnabled(
  completed.id,
  companyId,
  userId,
);

return this.toResponse(completed);
```

Helper:

```ts
private async autoPostCompletionAccountingIfEnabled(
  sourceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostProductionCompletion !==
    false
  ) {
    await this.accountingEngineService
      .postProductionCompletion(
        sourceId,
        companyId,
        userId,
      );
  }
}
```

## Retry-safe completion

Before entering the stock transaction:

```ts
if (
  existing.status ===
  ProductionOrderStatus.COMPLETED
) {
  await this.autoPostCompletionAccountingIfEnabled(
    existing.id,
    companyId,
    userId,
  );

  return this.toResponse(existing);
}
```

Critical behavior:

```text
second complete call
→ FG stock does NOT increase
→ actual cost does NOT recalculate destructively
→ accounting retries only
```

---

# 4. Production Variance

File:

```text
src/production-variance/production-variance.service.ts
```

After the variance is calculated/persisted:

```ts
const saved =
  await this.dataSource.transaction(
    async (manager) => {
      // EXISTING:
      // load production order
      // calculate expected cost
      // actualTotalCost - expectedTotalCost
      // persist signed totalVariance
      return savedVariance;
    },
  );

await this.autoPostVarianceAccountingIfEnabled(
  saved.id,
  companyId,
  userId,
);

return this.toResponse(saved);
```

Helper:

```ts
private async autoPostVarianceAccountingIfEnabled(
  sourceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostProductionVariance !==
    false
  ) {
    await this.accountingEngineService
      .postProductionVariance(
        sourceId,
        companyId,
        userId,
      );
  }
}
```

If variance recalculation updates the SAME domain record, posting must not
silently mutate an already-posted journal amount.

Use one of these policies:

```text
A. variance is immutable once posted
or
B. reverse old source journal, update variance, post new source journal
```

Prefer A for the first production-grade implementation unless the domain already
supports controlled recalculation/reversal.

---

# 5. Module imports

Each operational module that injects `AccountingEngineService` must import:

```ts
AccountingEngineModule
```

Each module that injects `AccountingSettingsEntity` directly must add it to:

```ts
TypeOrmModule.forFeature([...])
```

Do not manually provide `AccountingEngineService` inside feature modules.

---

# 6. Unit-test mocks

For each service spec, add:

```ts
{
  provide:
    getRepositoryToken(
      AccountingSettingsEntity,
    ),
  useValue: {
    findOne:
      jest.fn().mockResolvedValue({
        autoPostMaterialConsumption:
          true,
        autoPostProductionCompletion:
          true,
        autoPostProductionVariance:
          true,
      }),
  },
},
{
  provide:
    AccountingEngineService,
  useValue: {
    postMaterialConsumption:
      jest.fn(),
    postProductionCompletion:
      jest.fn(),
    postProductionVariance:
      jest.fn(),
  },
},
```

Use only the method relevant to each individual spec if you prefer smaller mocks.

---

# 7. Required tests

## Material Consumption

```text
POST once:
stock -10
journal count = 1

POST retry:
stock unchanged
journal count = 1
```

## Production Completion

```text
complete once:
FG +5
journal count = 1

complete retry:
FG unchanged
journal count = 1
```

## Production Variance

```text
positive variance:
Variance Dr / WIP Cr

negative variance:
WIP Dr / Variance Cr
```

Also test auto-post disabled:

```text
operational action succeeds
journal not created
```

---

# 8. Validation

```bash
rm -rf dist
npm run build

npm run audit:manufacturing:autopost

npm test -- --runInBand
```

Then:

```bash
export E2E_DATABASE_NAME=tallysync_e2e_test

npm run audit:entity-schema
npm run audit:accounting-idempotency
npm run audit:manufacturing:accounting
```

Target:

```text
Manufacturing accounting:
BLOCKER=0
HIGH=0

Manufacturing auto-post:
ERROR=0
```

Then proceed to manufacturing accounting E2E reconciliation.
