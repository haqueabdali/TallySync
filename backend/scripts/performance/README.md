# TallySync PostgreSQL Performance Diagnostics V1

This diagnostic is intentionally read-only. It does not create indexes, run migrations, or modify application data.

## Purpose

Measure the PostgreSQL execution plans used by the platform licensing dashboard and per-license usage/session paths before deciding whether a migration, query rewrite, pool change, or cache is justified.

## Required setup

Run against the same normal development/staging database used by the backend. Do not leave `DATABASE_NAME=tallysync_e2e_test` exported from E2E runs.

Set one existing license UUID:

```bash
export PERF_LICENSE_ID='YOUR-LICENSE-UUID'
```

`LOAD_LICENSE_ID` is accepted as a fallback.

## Run

```bash
cd /e/TallySync/backend
npm run perf:platform:diagnostics
```

Reports are written to:

```text
backend/artifacts/performance/
```

The report includes database identity, estimated row counts, existing indexes, and `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` plans for dashboard counts, expiration warnings, license lookup, active-user/activation counts, and active session counts.

## Safety

All explained statements are `SELECT` queries. The script performs no schema or data mutations.
