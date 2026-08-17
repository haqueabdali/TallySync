# Audit Logs Completion

Install at `src/audit-logs`.

This module reuses the existing
`src/users/entities/audit-log.entity.ts` and existing `audit_logs` table.
No migration and no duplicate entity are required.

Add to AppModule:

```ts
import { AuditLogsModule } from './audit-logs/audit-logs.module';
```

Then add `AuditLogsModule` to `imports`.

Endpoints:

- GET /audit-logs
- GET /audit-logs/summary
- GET /audit-logs/:id

The exported `AuditLogsService.record()` method can be reused by feature
modules. It recursively removes sensitive token/password/secret keys before
persisting old/new JSON values.
