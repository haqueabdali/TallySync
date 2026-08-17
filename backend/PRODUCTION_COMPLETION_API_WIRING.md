# Production Completion API Wiring

## 1. Replace ProductionOrdersService

Use:

```text
production-orders.service.complete-v2.ts
```

as:

```text
src/production-orders/production-orders.service.ts
```

This version fixes the completed-order retry path:

```text
COMPLETED retry
→ no operational mutation
→ retry Accounting Engine only
→ return current order
```

That is necessary for recovery when the production transaction committed but
the accounting call failed.

## 2. Expose the completion route

In the existing Production Orders controller, follow the controller's current
auth/company/user extraction convention.

Add a route equivalent to:

```ts
@Post(':id/complete')
async complete(
  @Param('id') id: string,
  // existing company context parameter
  // existing user/audit context parameter
) {
  return this.productionOrdersService.complete(
    id,
    companyId,
    userId,
  );
}
```

Do not invent new auth decorators if the controller already uses `@Req()`,
`@CurrentUser()`, `@AuditCtx()`, or another project convention.

The route should require the same authentication/authorization level as
release/start/cancel.

## 3. Unit tests

Add these ProductionOrdersService cases:

```text
IN_PROGRESS complete
→ status COMPLETED
→ actualEndDate populated
→ completedQuantity reaches plannedQuantity
→ actualTotalCost = material + labor + overhead
→ AccountingEngineService.postProductionCompletion called once

COMPLETED retry
→ transaction does not run again
→ postProductionCompletion is retried
→ response returned

DRAFT complete
→ BadRequestException

RELEASED complete
→ BadRequestException

autoPostProductionCompletion=false
→ completion succeeds
→ Accounting Engine is not called
```

## 4. Controller tests

Add:

```text
POST /production-orders/:id/complete
→ delegates id + companyId + userId
→ returns service response
```

Also verify mutation route authorization under your existing controller
security audit.

## 5. Add scripts

```json
"audit:production-completion:api": "ts-node -r tsconfig-paths/register scripts/audit/production-completion-api-readiness.ts"
```

## 6. Validation

```bash
rm -rf dist
npm run build

npm run audit:manufacturing:lifecycle-autopost
npm run audit:production-completion:api

npm test -- production-orders --runInBand
npm run audit:controllers
```

Targets:

```text
manufacturing lifecycle: ERROR=0 WARN=0
completion API: ERROR=0
controller security: PASS
```
