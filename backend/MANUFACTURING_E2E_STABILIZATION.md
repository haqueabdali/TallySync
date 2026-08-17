# Manufacturing E2E Stabilization

Your latest run exposed three independent failures.

## 1. E2E database migrations were not applied

The entity-schema audit showed 15 mismatches.

Nine belong to `accounting_settings`:

```text
raw_materials_inventory_account_id
work_in_progress_account_id
finished_goods_inventory_account_id
manufacturing_variance_account_id
direct_labor_account_id
manufacturing_overhead_account_id
auto_post_material_consumption
auto_post_production_completion
auto_post_production_variance
```

Four belong to `production_orders`:

```text
actual_material_cost
actual_labor_cost
actual_overhead_cost
actual_total_cost
```

One canonical variance column belongs to:

```text
production_variances.total_variance
```

These are exactly the new manufacturing migrations.

## 2. Remove `ProductionOrderEntity.totalVariance`

Your schema audit also reported:

```text
production_orders.total_variance
required by ProductionOrderEntity.totalVariance
```

That property should NOT be on ProductionOrderEntity under the current design.

The canonical variance domain is:

```text
ProductionVarianceEntity.totalVariance
```

Remove this accidental property from:

```text
src/production-orders/entities/production-order.entity.ts
```

Do NOT add another `production_orders.total_variance` column just to satisfy the
audit. That would duplicate the same business fact across two aggregates.

## 3. Run migrations against the E2E DB

Add:

```json
"e2e:migrate": "ts-node -r tsconfig-paths/register scripts/e2e/run-e2e-migrations.ts",
"audit:manufacturing:schema-preflight": "ts-node -r tsconfig-paths/register scripts/audit/manufacturing-schema-preflight.ts",
"audit:manufacturing:e2e-bootstrap": "ts-node -r tsconfig-paths/register scripts/audit/manufacturing-accounting-e2e-bootstrap.ts"
```

Then:

```bash
export E2E_DATABASE_NAME=tallysync_e2e_test

npm run e2e:migrate
npm run audit:manufacturing:schema-preflight
npm run audit:entity-schema
```

Expected:

```text
Manufacturing schema preflight passed.
Entity schema audit passed.
```

## 4. The current accounting E2E is still only a scaffold

The reason for:

```text
Cannot read properties of undefined (reading 'query')
```

is not PostgreSQL.

`dataSource` was declared but the generated `beforeAll()` never assigned it.
The fixture IDs/account IDs were also never created.

Run:

```bash
npm run audit:manufacturing:e2e-bootstrap
```

It should currently FAIL. That is correct.

Do not run:

```bash
npm run test:e2e:manufacturing-accounting
```

again until the bootstrap audit is green.

## 5. Correct E2E architecture

Reuse the same bootstrap pattern already used by the working commercial E2Es:

```text
load E2E DataSource
run migrations
create Nest TestingModule
create Nest application
initialize app
authenticate
create company-scoped fixture
configure accounts
execute manufacturing lifecycle
capture source IDs
then assert GL
```

The accounting E2E should never depend on random pre-existing DB rows.

## 6. Lifecycle auto-post is the next real implementation gap

Current result:

```text
ERROR = 9
WARN  = 5
```

That means the posting rules/accounting engine exist, but the operational
manufacturing services still are not invoking them.

Inspect:

```bash
cat artifacts/manufacturing-lifecycle-autopost.md
```

Fix the ERROR entries first.

Do not try to solve the 5 warnings until all 9 errors are gone.

## Correct execution order

```bash
rm -rf dist
npm run build

export E2E_DATABASE_NAME=tallysync_e2e_test

npm run e2e:migrate
npm run audit:manufacturing:schema-preflight
npm run audit:entity-schema

npm run audit:manufacturing:accounting
npm run audit:accounting-idempotency

npm run audit:manufacturing:lifecycle-autopost

npm run audit:manufacturing:e2e-bootstrap
```

Only when both final audits are green:

```bash
npm run test:e2e:manufacturing-accounting
```
