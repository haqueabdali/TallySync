# Manufacturing Auto-post Readiness

Generated: 2026-08-09T09:24:03.717Z

## WARN — Material Consumption

File: `src/material-consumption/material-consumption.service.ts`

No obvious posting/completion lifecycle method detected.

## ERROR — Material Consumption

File: `src/material-consumption/material-consumption.service.ts`

AccountingEngineService is not injected/imported.

## ERROR — Material Consumption

File: `src/material-consumption/material-consumption.service.ts`

No postMaterialConsumption(...) call detected.

## ERROR — Material Consumption

File: `src/material-consumption/material-consumption.service.ts`

No autoPostMaterialConsumption settings check detected.

## WARN — Material Consumption

File: `src/material-consumption/material-consumption.service.ts`

No obvious already-posted/completed retry path was detected.

## WARN — Production Completion

File: `src/production-orders/production-orders.service.ts`

No obvious posting/completion lifecycle method detected.

## ERROR — Production Completion

File: `src/production-orders/production-orders.service.ts`

AccountingEngineService is not injected/imported.

## ERROR — Production Completion

File: `src/production-orders/production-orders.service.ts`

No postProductionCompletion(...) call detected.

## ERROR — Production Completion

File: `src/production-orders/production-orders.service.ts`

No autoPostProductionCompletion settings check detected.

## WARN — Production Completion

File: `src/production-orders/production-orders.service.ts`

No obvious already-posted/completed retry path was detected.

## INFO — Production Variance

File: `src/production-variance/production-variance.service.ts`

Lifecycle signal detected: post(

## ERROR — Production Variance

File: `src/production-variance/production-variance.service.ts`

AccountingEngineService is not injected/imported.

## ERROR — Production Variance

File: `src/production-variance/production-variance.service.ts`

No postProductionVariance(...) call detected.

## ERROR — Production Variance

File: `src/production-variance/production-variance.service.ts`

No autoPostProductionVariance settings check detected.

## WARN — Production Variance

File: `src/production-variance/production-variance.service.ts`

No DataSource.transaction(...) signal detected.

## WARN — Production Variance

File: `src/production-variance/production-variance.service.ts`

No obvious already-posted/completed retry path was detected.
