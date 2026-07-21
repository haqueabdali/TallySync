# Mobile API V1

Copy the `mobile` folder to:

```text
src/mobile/
```

Then register `MobileModule` in `src/app.module.ts`.

## Endpoints

```http
GET  /api/v1/mobile/dashboard
GET  /api/v1/mobile/sales-orders
GET  /api/v1/mobile/sales-orders?syncStatus=pending
GET  /api/v1/mobile/sales-orders?search=SO-1001&page=1&limit=20
GET  /api/v1/mobile/sales-orders/:id
POST /api/v1/mobile/sales-orders/:id/sync
POST /api/v1/mobile/sales-orders/:id/retry
POST /api/v1/mobile/sales-orders/sync-pending
GET  /api/v1/mobile/tally/status
```

This module deliberately remains small. It reuses `TallySyncService` and
`TallyHealthService` and does not duplicate Tally integration logic.

## Required packages

The DTO uses packages normally already installed in NestJS projects:

```bash
npm install class-validator class-transformer
```

## Global validation

Make sure `main.ts` contains:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);
```
