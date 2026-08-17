# Production Hardening — Health

Add only:

- `src/health/`

No migration and no new npm dependency are required.

Endpoints:

- `GET /health/live`
- `GET /health/ready`

`/health/live` checks only that the NestJS process is running.

`/health/ready` performs a lightweight `SELECT 1` through the existing
TypeORM `DataSource`. It returns HTTP 503 when the database is unavailable.

Add `HealthModule` to `AppModule`.

Run:

```bash
rm -rf dist
npm run build
npm test -- health.service.spec.ts health.controller.spec.ts --runInBand
```

Then:

```bash
npm test -- --runInBand
```
