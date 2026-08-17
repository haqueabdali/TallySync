# Fix the 9 Manufacturing Auto-post ERROR Findings

The current report means each of the three services is missing the same three
pieces:

1. `AccountingEngineService` injection
2. the `autoPost...` setting check
3. the matching `post...()` call

Fix those 9 ERROR findings first. Leave the WARN layer for the next pass.

## 1. Add a method locator

Add:

```text
scripts/audit/manufacturing-lifecycle-method-locator.ts
```

and to `package.json`:

```json
"audit:manufacturing:lifecycle-methods": "ts-node -r tsconfig-paths/register scripts/audit/manufacturing-lifecycle-method-locator.ts"
```

Run:

```bash
npm run audit:manufacturing:lifecycle-methods
cat artifacts/manufacturing-lifecycle-methods.json
```

That prints the real method names and line numbers in all three services.

## 2. MaterialConsumptionService

File:

```text
src/material-consumption/material-consumption.service.ts
```

Add imports:

```ts
import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
```

Add constructor dependencies:

```ts
@InjectRepository(AccountingSettingsEntity)
private readonly accountingSettingsRepository:
  Repository<AccountingSettingsEntity>,

private readonly accountingEngineService:
  AccountingEngineService,
```

Add helper:

```ts
private async autoPostMaterialConsumptionIfEnabled(
  sourceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostMaterialConsumption ===
    false
  ) {
    return;
  }

  await this.accountingEngineService
    .postMaterialConsumption(
      sourceId,
      companyId,
      userId,
    );
}
```

Call it only after the existing business transaction has committed:

```ts
const saved =
  await this.dataSource.transaction(
    async (manager) => {
      // existing stock + header/line mutation
      return savedConsumption;
    },
  );

await this.autoPostMaterialConsumptionIfEnabled(
  saved.id,
  companyId,
  userId,
);

return this.toResponse(saved);
```

Retry path must not deduct stock again:

```ts
if (existing.status === YOUR_POSTED_STATUS) {
  await this.autoPostMaterialConsumptionIfEnabled(
    existing.id,
    companyId,
    userId,
  );

  return this.toResponse(existing);
}
```

Use the real enum member already present in your project.

## 3. ProductionOrdersService

File:

```text
src/production-orders/production-orders.service.ts
```

Add the same Accounting Settings repository and Accounting Engine service.

Helper:

```ts
private async autoPostProductionCompletionIfEnabled(
  sourceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostProductionCompletion ===
    false
  ) {
    return;
  }

  await this.accountingEngineService
    .postProductionCompletion(
      sourceId,
      companyId,
      userId,
    );
}
```

In the real completion method:

```ts
const completed =
  await this.dataSource.transaction(
    async (manager) => {
      // existing completion + FG stock + actual cost logic
      return savedOrder;
    },
  );

await this.autoPostProductionCompletionIfEnabled(
  completed.id,
  companyId,
  userId,
);

return this.toResponse(completed);
```

Retry protection must occur before FG stock changes:

```ts
if (
  existing.status ===
  YOUR_COMPLETED_STATUS
) {
  await this.autoPostProductionCompletionIfEnabled(
    existing.id,
    companyId,
    userId,
  );

  return this.toResponse(existing);
}
```

## 4. ProductionVarianceService

File:

```text
src/production-variance/production-variance.service.ts
```

Your current audit already detects an `async post(...)` lifecycle method.

Add the same dependencies.

Helper:

```ts
private async autoPostProductionVarianceIfEnabled(
  sourceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostProductionVariance ===
    false
  ) {
    return;
  }

  await this.accountingEngineService
    .postProductionVariance(
      sourceId,
      companyId,
      userId,
    );
}
```

After variance persistence/status mutation:

```ts
await this.autoPostProductionVarianceIfEnabled(
  saved.id,
  companyId,
  userId,
);
```

Your current report also says Production Variance has no obvious transaction.
If `post()` changes status or `totalVariance`, wrap that mutation in
`this.dataSource.transaction(...)`. If `post()` is purely a delegation method,
do not create a fake transaction; fix the audit heuristic instead.

## 5. Feature modules

In:

```text
MaterialConsumptionModule
ProductionOrdersModule
ProductionVarianceModule
```

import:

```ts
AccountingEngineModule
```

and add `AccountingSettingsEntity` to the module's
`TypeOrmModule.forFeature([...])` if the service reads that repository directly.

Do NOT add `AccountingEngineService` manually to `providers`.

## 6. Unit-test DI

Service specs may need:

```ts
{
  provide: getRepositoryToken(
    AccountingSettingsEntity,
  ),
  useValue: {
    findOne: jest.fn().mockResolvedValue({
      autoPostMaterialConsumption: true,
      autoPostProductionCompletion: true,
      autoPostProductionVariance: true,
    }),
  },
},
{
  provide: AccountingEngineService,
  useValue: {
    postMaterialConsumption: jest.fn(),
    postProductionCompletion: jest.fn(),
    postProductionVariance: jest.fn(),
  },
},
```

## 7. Validation

Run:

```bash
rm -rf dist
npm run build

npm run audit:manufacturing:lifecycle-autopost
```

Target for this stage:

```text
ERROR=0
WARN≈5
```

Then:

```bash
npm test -- --runInBand
```

Only after ERROR reaches zero should you clean up the warning layer and finish
the real Manufacturing Accounting E2E bootstrap.
