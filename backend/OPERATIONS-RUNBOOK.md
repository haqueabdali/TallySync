# TallySync Production Operations Runbook — V8

## Service topology

Client -> Nginx -> api-a / api-b -> PostgreSQL

Observability:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002
- PostgreSQL exporter: internal only
- Nginx exporter: internal only
- Blackbox exporter: internal only

## Start production + observability

```bash
cd /e/TallySync/backend

docker compose \
  --env-file .env.multi-instance \
  -f docker-compose.production.yml \
  -f docker-compose.observability.yml \
  up -d
```

## Verify

```bash
npm run verify:docker:observability
npm run verify:docker:backup-restore
npm run verify:docker:capacity
```

## Health checks

```bash
curl -i http://127.0.0.1:3000/lb-health
curl -i http://127.0.0.1:3000/health/live
curl -i http://127.0.0.1:3000/health/ready
```

## Useful service status

```bash
docker compose \
  --env-file .env.multi-instance \
  -f docker-compose.production.yml \
  -f docker-compose.observability.yml \
  ps -a
```

## Logs

```bash
docker compose \
  --env-file .env.multi-instance \
  -f docker-compose.production.yml \
  -f docker-compose.observability.yml \
  logs --tail=200 api-a api-b nginx postgres prometheus grafana
```

## Backup verification

```bash
npm run verify:docker:backup-restore
```

Backups are stored in:

`E:\TallySync\backend\artifacts\backups\`

Copy verified backups to storage outside the Docker host. A backup that only exists on the application machine is not sufficient disaster recovery.

## Alert interpretation

### TallySyncReadinessDown
The load-balanced readiness endpoint failed for >1 minute.
Check:
1. `docker compose ps -a`
2. api-a/api-b logs
3. PostgreSQL health
4. connection pool exhaustion

### TallySyncLoadBalancerDown
Nginx `/lb-health` failed.
Check:
1. Nginx container
2. host port binding
3. Nginx config syntax
4. Docker network

### PostgreSQLConnectionPressure
Connection utilization >75% for 5 minutes.
Check:
1. API replica count
2. `DATABASE_POOL_MAX`
3. long-running/idle transactions
4. background workers
5. reporting queries

Do not blindly raise `max_connections`; preserve the application connection budget.

## Replica failure

V5/V6 have already proven one-replica continuity. If api-a fails:

```bash
docker compose \
  --env-file .env.multi-instance \
  -f docker-compose.production.yml \
  restart api-a
```

Verify it rejoins with repeated:

```bash
curl -s -D - http://127.0.0.1:3000/health/live -o /dev/null \
  | grep -i X-TallySync-Upstream
```

## Database migration

Never run migrations concurrently from every API replica. Use the one-shot `migrate` compose service.

## Secret handling

Never commit:
- `.env`
- `.env.multi-instance`
- database passwords
- JWT secrets
- Platform Owner passwords
- Grafana admin password

Rotate any credential pasted into chat, terminal recordings, tickets, screenshots, or Git history.

## Data safety

Do NOT run:

```bash
docker compose down -v
```

unless intentionally deleting the PostgreSQL and observability volumes.
