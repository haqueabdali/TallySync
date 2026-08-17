# Manufacturing Lifecycle Auto-post Patch

Apply this only to the CURRENT lifecycle methods identified by the audit.

## Material Consumption

After the business transaction commits:

```ts
await this.autoPostMaterialConsumptionIfEnabled(
  saved.id,
  companyId,
  userId,
);
```

Helper:

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

  if (settings?.autoPostMaterialConsumption === false) {
    return;
  }

  await this.accountingEngineService.postMaterialConsumption(
    sourceId,
    companyId,
    userId,
  );
}
```

Retry rule:

```text
already Posted
→ do not decrement stock again
→ retry accounting only
→ return existing document
```

## Production Completion

After completion commits:

```ts
await this.autoPostProductionCompletionIfEnabled(
  completed.id,
  companyId,
  userId,
);
```

Retry rule:

```text
already Completed
→ do not add finished stock again
→ do not recalculate actual costs destructively
→ retry accounting only
```

Helper calls:

```ts
await this.accountingEngineService.postProductionCompletion(
  sourceId,
  companyId,
  userId,
);
```

## Production Variance

After variance persistence:

```ts
await this.autoPostProductionVarianceIfEnabled(
  saved.id,
  companyId,
  userId,
);
```

Helper calls:

```ts
await this.accountingEngineService.postProductionVariance(
  sourceId,
  companyId,
  userId,
);
```

For the first production-grade version, a posted variance should be immutable.
Recalculation after posting should require explicit reversal/repost support.

## Feature module wiring

Import:

```ts
AccountingEngineModule
```

Do not manually provide another `AccountingEngineService`.

If the service reads `AccountingSettingsEntity` directly, include it in that
feature module's `TypeOrmModule.forFeature([...])`.

## Required tests

```text
Material Consumption first call:
stock decreases once
journal count = 1

Material Consumption retry:
stock unchanged
journal count = 1

Production Completion first call:
finished stock increases once
journal count = 1

Production Completion retry:
finished stock unchanged
journal count = 1

Production Variance:
positive → Variance Dr / WIP Cr
negative → WIP Dr / Variance Cr

Auto-post disabled:
business operation succeeds
journal count = 0
```
