# TallySync Full Project Compatibility V4

This patch is built against the full TallySync archive supplied on 2026-08-18.

## Fixes

- Updates the actual Jest target `src/users/users.service.spec.ts` with a `LicensingService` mock.
- Overrides `LicenseFeatureGuard` in the ProductionOrders controller completion unit test.
- Adds `test/helpers/ensure-e2e-commercial-license.ts`.
- Seeds a real Enterprise E2E license in Sales-to-Cash and Procure-to-Pay test companies.
- Keeps licensing fail-closed in production; no `NODE_ENV=test` bypass is added.

## Apply from Git Bash

Extract this patch outside the backend folder, then:

```bash
bash apply.sh /e/TallySync/backend
```

Then:

```bash
cd /e/TallySync/backend
rm -rf dist
npm run build

export E2E_DATABASE_NAME=tallysync_e2e_test
export DATABASE_NAME=tallysync_e2e_test

npm test -- --runInBand
npm run test:e2e
```

## Validation performed here

- TypeScript build check (`tsc -p tsconfig.build.json --noEmit`): PASS
- `git diff --check` for patched files: PASS

The sandbox copy contains Windows-originated `node_modules` metadata, so direct Jest execution in the Linux sandbox is not reliable. Your Windows/Git Bash environment remains the authoritative runtime test environment.
