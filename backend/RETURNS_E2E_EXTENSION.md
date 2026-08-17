# Returns & Reversals E2E Extension

Do not create a third giant commercial fixture.

Extend the two E2Es that already create the authoritative source documents:

```text
test/sales-to-cash.e2e-spec.ts
test/procure-to-pay.e2e-spec.ts
```

This gives return tests real source IDs and keeps runtime much smaller.

---

# A. Sales-to-Cash E2E extension

## 1. Keep these source IDs

Your existing Sales-to-Cash test must retain:

```ts
salesInvoice.id
salesInvoice.items[0].id
item.id
warehouse.id
customer.id
```

The Sales Return API requires `salesInvoiceId`, `warehouseId`, and one or more
items containing `salesInvoiceItemId`, `itemId`, and `returnQuantity`.

## 2. Add response interface

```ts
interface SalesReturnResponse {
  id: string;
  status: string;
  salesInvoiceId: string;
  customerId: string;
  warehouseId: string;
  grandTotal: number;
  items: Array<{
    id: string;
    salesInvoiceItemId: string;
    itemId: string;
    returnQuantity: number;
    lineTotal: number;
  }>;
}
```

## 3. Record stock before return

Immediately before creating the Sales Return:

```ts
const beforeReturnItemResponse =
  await request(
    app.getHttpServer(),
  )
    .get(
      `${api}/items/${item.id}`,
    )
    .set(auth)
    .expect(200);

const beforeReturnStock =
  Number(
    beforeReturnItemResponse.body
      .currentStock,
  );
```

If your current Item response still exposes a different canonical stock field,
use the same field already asserted elsewhere in `sales-to-cash.e2e-spec.ts`.

## 4. Create a one-unit Sales Return

```ts
const salesReturnResponse =
  await request(
    app.getHttpServer(),
  )
    .post(
      `${api}/sales-returns`,
    )
    .set(auth)
    .send({
      salesInvoiceId:
        salesInvoice.id,
      warehouseId:
        warehouse.id,
      returnDate: date,
      reason:
        'E2E customer return',
      items: [
        {
          salesInvoiceItemId:
            salesInvoice.items[0].id,
          itemId:
            item.id,
          returnQuantity: 1,
        },
      ],
    })
    .expect(201);

const salesReturn =
  salesReturnResponse.body
    as SalesReturnResponse;

expect(
  salesReturn.status,
).toBe('draft');
```

## 5. Post the Sales Return

```ts
const postedReturnResponse =
  await request(
    app.getHttpServer(),
  )
    .post(
      `${api}/sales-returns/${salesReturn.id}/post`,
    )
    .set(auth)
    .expect(200);

const postedReturn =
  postedReturnResponse.body
    as SalesReturnResponse;

expect(
  postedReturn.status,
).toBe('posted');
```

## 6. Verify stock increased

```ts
const afterReturnItemResponse =
  await request(
    app.getHttpServer(),
  )
    .get(
      `${api}/items/${item.id}`,
    )
    .set(auth)
    .expect(200);

expect(
  Number(
    afterReturnItemResponse.body
      .currentStock,
  ),
).toBeCloseTo(
  beforeReturnStock + 1,
  3,
);
```

## 7. Retry `/post`

Call the same endpoint again:

```ts
await request(
  app.getHttpServer(),
)
  .post(
    `${api}/sales-returns/${salesReturn.id}/post`,
  )
  .set(auth)
  .expect(200);
```

The second call must NOT add stock again and must NOT create another source
journal.

Verify stock remains:

```ts
const retryStock =
  await request(
    app.getHttpServer(),
  )
    .get(
      `${api}/items/${item.id}`,
    )
    .set(auth)
    .expect(200);

expect(
  Number(
    retryStock.body.currentStock,
  ),
).toBeCloseTo(
  beforeReturnStock + 1,
  3,
);
```

If the current SalesReturnsService still rejects an already-posted retry, make
its `post()` method retry-safe in the same pattern already used for Purchase
Invoice / Supplier Payment:

```text
already Posted
→ do not mutate invoice/customer/stock
→ retry only AccountingEngine.postSalesReturn()
→ return existing document
```

## 8. Verify Sales Return GL source is unique

Use the JournalEntry repository or API to assert exactly one live journal where:

```text
source_type = sales_return
source_id   = salesReturn.id
```

Expected:

```ts
expect(sourceJournalCount).toBe(1);
```

## 9. Reverse the Sales Return

The route is:

```text
POST /api/v1/sales-returns/:id/reverse
```

Payload:

```ts
{
  reversalReason:
    'E2E reversal validation',
}
```

Expected:

```ts
const reversedResponse =
  await request(
    app.getHttpServer(),
  )
    .post(
      `${api}/sales-returns/${salesReturn.id}/reverse`,
    )
    .set(auth)
    .send({
      reversalReason:
        'E2E reversal validation',
    })
    .expect(200);

expect(
  reversedResponse.body.status,
).toBe('reversed');
```

## 10. Verify stock returns to pre-return value

```ts
const afterReverseItem =
  await request(
    app.getHttpServer(),
  )
    .get(
      `${api}/items/${item.id}`,
    )
    .set(auth)
    .expect(200);

expect(
  Number(
    afterReverseItem.body.currentStock,
  ),
).toBeCloseTo(
  beforeReturnStock,
  3,
);
```

## 11. Verify the accounting source journal is reversed

The source journal should have:

```text
status = reversed
reversal_entry_id != null
```

and exactly one reversal journal should exist.

---

# B. Procure-to-Pay E2E extension

The purchase flow already owns:

```ts
supplier.id
warehouse.id
item.id
po.id
po.items[0].id
grn.id
grn.items[0].id
invoice.id
invoice.items[0].id
```

Run the Purchase Return BEFORE fully paying the invoice, or create a second
small purchase invoice specifically for the return test. This keeps AP behavior
unambiguous.

## 1. Add response interface

```ts
interface PurchaseReturnResponse {
  id: string;
  status: string;
  supplierId: string;
  warehouseId: string;
  purchaseInvoiceId: string | null;
  goodsReceiptId: string | null;
  grandTotal: number;
  items: Array<{
    id: string;
    itemId: string;
    purchaseInvoiceItemId:
      string | null;
    goodsReceiptItemId:
      string | null;
    quantity: number;
    lineTotal: number;
  }>;
}
```

## 2. Record stock

```ts
const beforePurchaseReturn =
  await request(
    app.getHttpServer(),
  )
    .get(
      `${api}/items/${item.id}`,
    )
    .set(auth)
    .expect(200);

const stockBeforePurchaseReturn =
  Number(
    beforePurchaseReturn.body
      .currentStock,
  );
```

## 3. Create Purchase Return

The DTO supports source binding to both invoice and goods receipt.

```ts
const purchaseReturnResponse =
  await request(
    app.getHttpServer(),
  )
    .post(
      `${api}/purchase-returns`,
    )
    .set(auth)
    .send({
      supplierId:
        supplier.id,
      warehouseId:
        warehouse.id,
      purchaseInvoiceId:
        invoice.id,
      goodsReceiptId:
        grn.id,
      returnDate: date,
      currency:
        'EUR',
      reason:
        'E2E supplier return',
      items: [
        {
          itemId:
            item.id,
          purchaseInvoiceItemId:
            invoice.items[0].id,
          goodsReceiptItemId:
            grn.items[0].id,
          quantity: 1,
          unitPrice: 60,
          discountPercent: 0,
          taxPercent: 0,
        },
      ],
    })
    .expect(201);

const purchaseReturn =
  purchaseReturnResponse.body
    as PurchaseReturnResponse;

expect(
  purchaseReturn.status,
).toBe('Draft');
```

## 4. Post Purchase Return

```ts
const postedPurchaseReturn =
  await request(
    app.getHttpServer(),
  )
    .post(
      `${api}/purchase-returns/${purchaseReturn.id}/post`,
    )
    .set(auth)
    .expect(200);

expect(
  postedPurchaseReturn.body.status,
).toBe('Posted');
```

The Purchase Return service already validates the source return quantity against
the posted GRN and purchase invoice before posting.

## 5. Verify stock decreased by one

```ts
const afterPurchaseReturn =
  await request(
    app.getHttpServer(),
  )
    .get(
      `${api}/items/${item.id}`,
    )
    .set(auth)
    .expect(200);

expect(
  Number(
    afterPurchaseReturn.body
      .currentStock,
  ),
).toBeCloseTo(
  stockBeforePurchaseReturn - 1,
  3,
);
```

## 6. Verify accounting

Expected journal:

```text
Accounts Payable                 Dr 60
Purchase Returns / Inventory     Cr 60
```

For zero-tax E2E there is no Input Tax line.

Assert one live source journal:

```text
source_type = purchase_return
source_id   = purchaseReturn.id
```

## 7. Retry `/post`

```ts
await request(
  app.getHttpServer(),
)
  .post(
    `${api}/purchase-returns/${purchaseReturn.id}/post`,
  )
  .set(auth)
  .expect(200);
```

Verify:

```text
stock unchanged after retry
supplier balance unchanged after retry
journal source count = 1
```

## 8. Cancel Purchase Return

The current Purchase Return service treats cancel of a posted return as an
operational reversal: it restores stock and supplier balance.

```ts
const cancelledReturn =
  await request(
    app.getHttpServer(),
  )
    .post(
      `${api}/purchase-returns/${purchaseReturn.id}/cancel`,
    )
    .set(auth)
    .expect(200);

expect(
  cancelledReturn.body.status,
).toBe('Cancelled');
```

## 9. Accounting reversal requirement

A posted Purchase Return cancellation must also reverse its source journal.

If the current `cancel()` only restores stock/supplier balance but does not call
Accounting Engine reversal, add after the business transaction commits:

```ts
await this.accountingEngineService.reverse(
  {
    sourceType:
      JournalEntrySourceType.PURCHASE_RETURN,
    sourceId:
      purchaseReturn.id,
    reversalReason:
      'Purchase return cancelled',
  },
  companyId,
  userId,
);
```

Do this OUTSIDE the stock/supplier transaction, with retry-safe behavior.

Then assert:

```text
original purchase_return journal status = reversed
reversal_entry_id != null
```

---

# C. Recommended package.json scripts

```json
"audit:returns-readiness": "ts-node -r tsconfig-paths/register scripts/audit-returns-readiness.ts",
"test:e2e:commercial": "jest --config ./test/jest-e2e.json sales-to-cash.e2e-spec.ts procure-to-pay.e2e-spec.ts --runInBand"
```

---

# D. Gate order

```bash
rm -rf dist
npm run build

npm run audit:security
npm run audit:returns-readiness

export E2E_DATABASE_NAME=tallysync_e2e_test

npm run audit:entity-schema
npm run audit:accounting-idempotency

npm test -- --runInBand

npm run test:e2e:business
npm run test:e2e:procure
```

When both extended flows pass, mark:

```text
Sales Return E2E        ✅
Sales Return reversal   ✅
Purchase Return E2E     ✅
Purchase Return cancel  ✅
Return GL idempotency   ✅
Commercial + Returns    ✅
```
