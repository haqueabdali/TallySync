# Recommended package.json scripts

Keep your existing migration command names if they already work.

Add only the read-only deployment gate:

```json
{
  "scripts": {
    "migration:check": "ts-node scripts/check-migrations.ts"
  }
}
```

If your project uses `typeorm-ts-node-commonjs`, an equivalent script is fine.

Recommended deployment order:

```bash
npm ci
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand

# Explicit schema change step
npm run migration:run

# Verify migration state is clean
npm run migration:check

# Start the compiled API
npm run start:prod
```

Never use:

```bash
typeorm schema:sync
```

against staging or production.
