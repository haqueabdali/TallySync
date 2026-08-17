# Migration Safety Rules

1. `synchronize` must remain `false`.
2. API startup must not run schema migrations automatically.
3. Run migrations as an explicit deployment step.
4. Run migrations exactly once per environment/deployment.
5. Back up the production database before destructive migrations.
6. PostgreSQL enum changes require explicit migrations.
7. Never generate a migration and deploy it without reviewing its `up()` and
   `down()` methods.
8. Avoid `DROP COLUMN`, `DROP TABLE`, and enum replacement in the same release
   that application code stops using the old structure. Prefer expand/migrate/
   contract deployment phases for destructive changes.
9. Run `migration:check` after `migration:run`.
10. A deployment must fail if pending migrations remain.

The project previously experienced an enum schema-sync failure while TypeORM
attempted to rename/recreate/drop a PostgreSQL enum. Migration-only schema
management prevents the API startup path from performing that class of change.
