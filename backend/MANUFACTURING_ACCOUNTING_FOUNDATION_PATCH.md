# Manufacturing Accounting Foundation — Targeted Source Patch

Apply these changes to the CURRENT files. Do not overwrite entire files with
older snapshots.

---

## 1. AccountingSettingsEntity

File:

```text
src/accounting-settings/entities/accounting-settings.entity.ts
```

Add:

```ts
@Column({
  name:
    'raw_materials_inventory_account_id',
  type: 'uuid',
  nullable: true,
})
rawMaterialsInventoryAccountId!:
  string | null;

@Column({
  name:
    'work_in_progress_account_id',
  type: 'uuid',
  nullable: true,
})
workInProgressAccountId!:
  string | null;

@Column({
  name:
    'finished_goods_inventory_account_id',
  type: 'uuid',
  nullable: true,
})
finishedGoodsInventoryAccountId!:
  string | null;

@Column({
  name:
    'manufacturing_variance_account_id',
  type: 'uuid',
  nullable: true,
})
manufacturingVarianceAccountId!:
  string | null;

@Column({
  name:
    'direct_labor_account_id',
  type: 'uuid',
  nullable: true,
})
directLaborAccountId!:
  string | null;

@Column({
  name:
    'manufacturing_overhead_account_id',
  type: 'uuid',
  nullable: true,
})
manufacturingOverheadAccountId!:
  string | null;

@Column({
  name:
    'auto_post_material_consumption',
  type: 'boolean',
  default: true,
})
autoPostMaterialConsumption!: boolean;

@Column({
  name:
    'auto_post_production_completion',
  type: 'boolean',
  default: true,
})
autoPostProductionCompletion!: boolean;

@Column({
  name:
    'auto_post_production_variance',
  type: 'boolean',
  default: true,
})
autoPostProductionVariance!: boolean;
```

---

## 2. AccountingSettingsService

File:

```text
src/accounting-settings/accounting-settings.service.ts
```

Extend `AccountField`:

```ts
| 'rawMaterialsInventoryAccountId'
| 'workInProgressAccountId'
| 'finishedGoodsInventoryAccountId'
| 'manufacturingVarianceAccountId'
| 'directLaborAccountId'
| 'manufacturingOverheadAccountId'
```

Add all six fields to:

```ts
private readonly accountFields:
  AccountField[] = [...]
```

This is important because the existing service validates every configured
automatic-posting account for:

```text
same company
ACTIVE status
not a group account
```

Do not bypass that validation.

When creating default settings, add:

```ts
autoPostMaterialConsumption:
  true,

autoPostProductionCompletion:
  true,

autoPostProductionVariance:
  true,
```

In `update()` add:

```ts
if (
  dto.autoPostMaterialConsumption !==
  undefined
) {
  settings.autoPostMaterialConsumption =
    dto.autoPostMaterialConsumption;
}

if (
  dto.autoPostProductionCompletion !==
  undefined
) {
  settings.autoPostProductionCompletion =
    dto.autoPostProductionCompletion;
}

if (
  dto.autoPostProductionVariance !==
  undefined
) {
  settings.autoPostProductionVariance =
    dto.autoPostProductionVariance;
}
```

---

## 3. UpdateAccountingSettingsDto

File:

```text
src/accounting-settings/dto/update-accounting-settings.dto.ts
```

Add six optional UUID properties:

```ts
@ApiPropertyOptional()
@IsOptional()
@IsUUID()
rawMaterialsInventoryAccountId?:
  string;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
workInProgressAccountId?:
  string;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
finishedGoodsInventoryAccountId?:
  string;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
manufacturingVarianceAccountId?:
  string;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
directLaborAccountId?:
  string;

@ApiPropertyOptional()
@IsOptional()
@IsUUID()
manufacturingOverheadAccountId?:
  string;
```

Add three optional switches:

```ts
@ApiPropertyOptional()
@IsOptional()
@IsBoolean()
autoPostMaterialConsumption?:
  boolean;

@ApiPropertyOptional()
@IsOptional()
@IsBoolean()
autoPostProductionCompletion?:
  boolean;

@ApiPropertyOptional()
@IsOptional()
@IsBoolean()
autoPostProductionVariance?:
  boolean;
```

---

## 4. AccountingSettingsResponseDto

File:

```text
src/accounting-settings/dto/accounting-settings-response.dto.ts
```

Add:

```ts
@ApiProperty({
  required: false,
  nullable: true,
})
rawMaterialsInventoryAccountId!:
  string | null;

@ApiProperty({
  required: false,
  nullable: true,
})
workInProgressAccountId!:
  string | null;

@ApiProperty({
  required: false,
  nullable: true,
})
finishedGoodsInventoryAccountId!:
  string | null;

@ApiProperty({
  required: false,
  nullable: true,
})
manufacturingVarianceAccountId!:
  string | null;

@ApiProperty({
  required: false,
  nullable: true,
})
directLaborAccountId!:
  string | null;

@ApiProperty({
  required: false,
  nullable: true,
})
manufacturingOverheadAccountId!:
  string | null;

@ApiProperty()
autoPostMaterialConsumption!:
  boolean;

@ApiProperty()
autoPostProductionCompletion!:
  boolean;

@ApiProperty()
autoPostProductionVariance!:
  boolean;
```

---

## 5. AccountingSettingsService.toResponse()

Add:

```ts
rawMaterialsInventoryAccountId:
  settings.rawMaterialsInventoryAccountId,

workInProgressAccountId:
  settings.workInProgressAccountId,

finishedGoodsInventoryAccountId:
  settings.finishedGoodsInventoryAccountId,

manufacturingVarianceAccountId:
  settings.manufacturingVarianceAccountId,

directLaborAccountId:
  settings.directLaborAccountId,

manufacturingOverheadAccountId:
  settings.manufacturingOverheadAccountId,

autoPostMaterialConsumption:
  settings.autoPostMaterialConsumption,

autoPostProductionCompletion:
  settings.autoPostProductionCompletion,

autoPostProductionVariance:
  settings.autoPostProductionVariance,
```

---

## 6. JournalEntrySourceType

File:

```text
src/journal-entries/enums/journal-entry-source-type.enum.ts
```

Add:

```ts
MATERIAL_CONSUMPTION =
  'material_consumption',

PRODUCTION_COMPLETION =
  'production_completion',

PRODUCTION_VARIANCE =
  'production_variance',
```

If the enum intentionally keeps PascalCase aliases, add matching aliases too,
but do not add duplicate values unless that convention already exists.

---

## 7. Do NOT implement posting rules yet

After this foundation, the remaining three HIGH audit findings should be the
actual posting rules:

```text
MaterialConsumptionPostingRule
ProductionCompletionPostingRule
ProductionVariancePostingRule
```

Do not fabricate their entity-field access.

First run the accounting readiness audit again. Then generate exact source
contracts for:

```text
MaterialConsumption entity + lines
ProductionOrder / FG receipt entity
ProductionVariance entity
Inventory Cost Engine valuation result
```

The rules must use fields that actually exist.

---

## 8. Conceptual rules for the next stage

Material Consumption:

```text
WIP                         Dr
Raw Materials Inventory     Cr
```

Production Completion:

```text
Finished Goods Inventory    Dr
WIP                         Cr
```

Production Variance:

```text
Manufacturing Variance      Dr/Cr
WIP                         balancing side
```

No hard-coded account IDs.

---

## 9. Validate

```bash
rm -rf dist
npm run build

export E2E_DATABASE_NAME=tallysync_e2e_test

npm run audit:entity-schema
npm run audit:manufacturing:accounting
```

Expected progress:

```text
BLOCKER = 0
HIGH    ≈ 3
```

If HIGH is still greater than 3, use the generated markdown report to address
the remaining contract fields before creating posting rules.
