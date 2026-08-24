# TallySync V5 Docker Failure/Recovery Verification

Add to `backend/package.json`:

```json
"verify:docker:failure-recovery": "ts-node -r tsconfig-paths/register scripts/verification/docker-failure-recovery-v5.ts"
```

Prerequisite: V4 Docker stack is already running.

Run:

```bash
cd /e/TallySync/backend
npm run verify:docker:failure-recovery
```

Optional authenticated verification:

```bash
export MULTI_INSTANCE_EMAIL='owner@tallysync.com'
export MULTI_INSTANCE_PASSWORD='...'
```

Reports are written to `backend/artifacts/verification/`.
