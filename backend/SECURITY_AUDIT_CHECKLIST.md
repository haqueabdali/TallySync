# Security audit checklist

- JWT/refresh rotation and password-reset behavior tested.
- Suspended/soft-deleted users cannot authenticate.
- Mutation controllers require auth unless explicitly public.
- Administrative operations require roles.
- Company isolation is enforced in services/repositories.
- DTO whitelist and forbidNonWhitelisted enabled.
- Production CORS allowlist configured.
- Request body limit and throttling enabled.
- Swagger disabled by default in production.
- Production 500 responses hide internals.
- synchronize=false and migrationsRun=false.
- No duplicate api/v1 controller prefix.
- No circular dependencies.
- No committed secrets/private keys.
- Unit and E2E suites green.
