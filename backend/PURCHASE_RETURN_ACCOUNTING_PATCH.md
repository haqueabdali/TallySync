# Purchase Return Accounting Bridge — Targeted Patch

Apply these changes to the CURRENT versions of the files. Do not overwrite
whole files with older copies.

---

## 1. JournalEntrySourceType

File:

```text
src/journal-entries/enums/journal-entry-source-type.enum.ts
```

Add:

```ts
PURCHASE_RETURN = 'purchase_return',
```

and, if you still keep the PascalCase aliases, add:

```ts
PurchaseReturn = 'purchase_return',
```

So the business source list contains:

```text
sales_invoice
customer_payment
sales_return
goods_receipt
purchase_invoice
supplier_payment
purchase_return
```

The existing `PurchaseReturnPostingRule` already returns:

```ts
sourceType:
  JournalEntrySourceType.PURCHASE_RETURN,
```

so this enum value is required.

---

## 2. Accounting Engine module

File:

```text
src/accounting-engine/accounting-engine.module.ts
```

Import:

```ts
import { PurchaseReturn } from '../purchase-returns/entities/purchase-return.entity';
import { PurchaseReturnPostingRule } from './posting-rules/purchase-return.rule';
```

Add `PurchaseReturn` to:

```ts
TypeOrmModule.forFeature([...])
```

Add `PurchaseReturnPostingRule` to:

```ts
providers: [...]
```

---

## 3. Accounting Engine service

File:

```text
src/accounting-engine/accounting-engine.service.ts
```

Import:

```ts
import { PurchaseReturn } from '../purchase-returns/entities/purchase-return.entity';
import { PurchaseReturnPostingRule } from './posting-rules/purchase-return.rule';
```

Add constructor dependency:

```ts
private readonly purchaseReturnPostingRule:
  PurchaseReturnPostingRule,
```

Add convenience method:

```ts
async postPurchaseReturn(
  returnId: string,
  companyId: string,
  userId: string,
): Promise<PostingResultResponseDto> {
  return this.post(
    {
      sourceType:
        JournalEntrySourceType.PURCHASE_RETURN,
      sourceId: returnId,
    },
    companyId,
    userId,
  );
}
```

Inside `buildPostingDocument()` add:

```ts
case JournalEntrySourceType.PURCHASE_RETURN: {
  const source: PurchaseReturn =
    await this.purchaseReturnPostingRule.load(
      sourceId,
      companyId,
    );

  return this.purchaseReturnPostingRule.build(
    source,
    companyId,
  );
}
```

The accounting result is:

```text
Accounts Payable                Dr
Purchase Returns / Inventory    Cr
Input Tax (when applicable)     Cr
```

---

## 4. Accounting Engine barrel export

File:

```text
src/accounting-engine/index.ts
```

Add:

```ts
export * from './posting-rules/purchase-return.rule';
```

---

## 5. Accounting settings entity

File:

```text
src/accounting-settings/entities/accounting-settings.entity.ts
```

Add account mapping:

```ts
@Column({
  name: 'purchase_returns_account_id',
  type: 'uuid',
  nullable: true,
})
purchaseReturnsAccountId!: string | null;
```

Add switch:

```ts
@Column({
  name: 'auto_post_purchase_returns',
  type: 'boolean',
  default: true,
})
autoPostPurchaseReturns!: boolean;
```

Keep the purchase-invoice/payment fields you already added previously.

---

## 6. UpdateAccountingSettingsDto

File:

```text
src/accounting-settings/dto/update-accounting-settings.dto.ts
```

Add:

```ts
@ApiPropertyOptional()
@IsOptional()
@IsUUID()
purchaseReturnsAccountId?: string;
```

Add:

```ts
@ApiPropertyOptional()
@IsOptional()
@IsBoolean()
autoPostPurchaseReturns?: boolean;
```

---

## 7. AccountingSettingsResponseDto

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
purchaseReturnsAccountId!: string | null;
```

Add:

```ts
@ApiProperty()
autoPostPurchaseReturns!: boolean;
```

Also make sure this response DTO contains the purchase invoice/payment
auto-post flags you added earlier, so the API reflects the current entity.

---

## 8. AccountingSettingsService

File:

```text
src/accounting-settings/accounting-settings.service.ts
```

Extend `AccountField` with:

```ts
| 'purchaseReturnsAccountId'
```

Add it to `accountFields`:

```ts
'purchaseReturnsAccountId',
```

When creating default settings add:

```ts
autoPostPurchaseReturns: true,
```

In update logic add:

```ts
if (
  dto.autoPostPurchaseReturns !==
  undefined
) {
  settings.autoPostPurchaseReturns =
    dto.autoPostPurchaseReturns;
}
```

In `toResponse()` add:

```ts
purchaseReturnsAccountId:
  settings.purchaseReturnsAccountId,

autoPostPurchaseReturns:
  settings.autoPostPurchaseReturns,
```

---

## 9. PurchaseReturnsModule

File:

```text
src/purchase-returns/purchase-returns.module.ts
```

Import:

```ts
import { AccountingEngineModule } from '../accounting-engine/accounting-engine.module';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
```

Add:

```ts
AccountingEngineModule,
```

to module `imports`.

Add:

```ts
AccountingSettingsEntity,
```

to `TypeOrmModule.forFeature([...])`.

---

## 10. PurchaseReturnsService dependencies

File:

```text
src/purchase-returns/purchase-returns.service.ts
```

Import:

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

---

## 11. Make Purchase Return posting retry-safe

The current `post()` immediately calls:

```ts
this.ensureDraft(purchaseReturn);
```

That means a second `/post` cannot recover an accounting failure after the
stock/supplier transaction succeeded.

Before `ensureDraft()`, add:

```ts
if (
  purchaseReturn.status ===
  PurchaseReturnStatus.Posted
) {
  await this.autoPostAccountingIfEnabled(
    purchaseReturn.id,
    companyId,
    userId,
  );

  return this.toResponse(
    purchaseReturn,
  );
}
```

However, because the current method is INSIDE a `dataSource.transaction()`,
do not call AccountingEngineService from inside that same transaction for the
newly posted document.

Refactor the normal path to:

```text
transaction:
  validate
  decrease stock
  decrease supplier balance
  mark return Posted
  save
transaction commits
        ↓
autoPostAccountingIfEnabled()
        ↓
return response
```

A safe shape is:

```ts
const saved =
  await this.dataSource.transaction(
    async (manager) => {
      // existing business posting logic

      purchaseReturn.status =
        PurchaseReturnStatus.Posted;

      purchaseReturn.updatedBy =
        userId;

      return returnRepository.save(
        purchaseReturn,
      );
    },
  );

await this.autoPostAccountingIfEnabled(
  saved.id,
  companyId,
  userId,
);

return this.toResponse(saved);
```

For already-posted retry:

```ts
const existing =
  await this.returnRepository.findOne({
    where: { id, companyId },
    relations: { items: true },
  });

if (!existing) {
  throw new NotFoundException(
    'Purchase return not found.',
  );
}

if (
  existing.status ===
  PurchaseReturnStatus.Posted
) {
  await this.autoPostAccountingIfEnabled(
    existing.id,
    companyId,
    userId,
  );

  return this.toResponse(existing);
}
```

Then execute the existing transaction only for Draft status.

---

## 12. Add helper

Add to `PurchaseReturnsService`:

```ts
private async autoPostAccountingIfEnabled(
  returnId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const settings =
    await this.accountingSettingsRepository.findOne({
      where: { companyId },
    });

  if (
    settings?.autoPostPurchaseReturns !==
    false
  ) {
    await this.accountingEngineService.postPurchaseReturn(
      returnId,
      companyId,
      userId,
    );
  }
}
```

This uses the Accounting Engine's source-journal idempotency that we just
hardened at PostgreSQL level.

---

## 13. Unit test dependency mocks

Any `PurchaseReturnsService` unit test that constructs the service directly
must now provide:

```ts
{
  provide:
    getRepositoryToken(
      AccountingSettingsEntity,
    ),
  useValue: {
    findOne:
      jest.fn().mockResolvedValue({
        autoPostPurchaseReturns:
          true,
      }),
  },
},
{
  provide:
    AccountingEngineService,
  useValue: {
    postPurchaseReturn:
      jest.fn().mockResolvedValue(
        undefined,
      ),
  },
},
```

---

## 14. Validate

```bash
rm -rf dist
npm run build

npm test -- purchase-returns.spec.ts --runInBand
npm test -- accounting-engine.spec.ts --runInBand

export E2E_DATABASE_NAME=tallysync_e2e_test

npm run audit:entity-schema
npm run audit:accounting-idempotency

npm run test:e2e:business
npm run test:e2e:procure
```

After the normal suites remain green, the next E2E development should be:

```text
Purchase Invoice
→ Goods received
→ Purchase Return
→ Stock decreases
→ Supplier liability decreases
→ AP Dr
→ Inventory/Purchase Returns Cr
→ Input Tax Cr
→ retry /post
→ no duplicate GL journal
```
