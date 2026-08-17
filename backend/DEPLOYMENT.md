# TallySync Production Deployment

## 1. Validate locally

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run migration:check
```

## 2. Prepare deployment environment

Copy:

```text
.env.deploy.example
```

to:

```text
.env.deploy
```

and replace all secrets/placeholders.

Never commit `.env.deploy`.

## 3. Run migrations explicitly

Migrations should run before starting the new API version.

For a direct Node deployment:

```bash
npm run migration:run
npm run migration:check
```

For a container deployment, run migrations from a temporary build/container
step or CI job before rolling out the API container.

Do not enable TypeORM `synchronize`.

## 4. Build

```bash
docker compose \
  --env-file .env.deploy \
  -f docker-compose.production.yml \
  build
```

## 5. Start

```bash
docker compose \
  --env-file .env.deploy \
  -f docker-compose.production.yml \
  up -d
```

## 6. Verify

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

Check:

```bash
docker compose \
  --env-file .env.deploy \
  -f docker-compose.production.yml \
  ps
```

## 7. Logs

```bash
docker compose \
  --env-file .env.deploy \
  -f docker-compose.production.yml \
  logs -f api
```

## 8. Shutdown

```bash
docker compose \
  --env-file .env.deploy \
  -f docker-compose.production.yml \
  down
```

Do not add `-v` unless you intentionally want to delete the PostgreSQL volume.

## Production notes

- Runtime container runs as a non-root user.
- Development dependencies are excluded from the final image.
- Source TypeScript is not required in the runtime image.
- Swagger remains disabled by default in production.
- API readiness depends on PostgreSQL readiness.
- Application shutdown hooks remain enabled.
