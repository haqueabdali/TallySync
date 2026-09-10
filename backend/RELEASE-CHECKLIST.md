# TallySync V9 Production Release Checklist

## Before release

- [ ] Working tree reviewed; intended changes committed.
- [ ] Platform Owner password rotated if it appeared in chat/logs/screenshots.
- [ ] Seed admin password is not `Admin@123`.
- [ ] `.env.multi-instance` is not tracked by Git.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are different and >=32 chars.
- [ ] `PLATFORM_ADMIN_PASSWORD` and `SEED_ADMIN_PASSWORD` are different.
- [ ] `ENABLE_SWAGGER=false`.
- [ ] CORS origins are explicit; no wildcard.
- [ ] Database pool budget is valid for replica count.
- [ ] Docker stack is healthy.
- [ ] V8 observability is healthy.
- [ ] Verified backup exists outside the Docker host.
- [ ] V6 capacity/failover verification passes.

## Release command

```bash
cd /e/TallySync/backend
npm run release:gate
```

## Expected result

```text
TallySync V9 RELEASE GATE PASSED.
```

## After release

- [ ] Verify `/lb-health`, `/health/live`, `/health/ready`.
- [ ] Verify Platform Owner login.
- [ ] Check Prometheus targets.
- [ ] Check Grafana operations dashboard.
- [ ] Confirm no firing critical alerts.
- [ ] Create and externally copy a post-release verified backup.
- [ ] Observe logs/errors for the first production window.

## Do not release if

- Any gate fails.
- Backup restore has not passed.
- High/critical production dependency audit findings remain unresolved or explicitly risk-accepted.
- Secrets are present in Git history/current tracked files.
- Database connection budget is exceeded.
- Only one replica is healthy unexpectedly.
