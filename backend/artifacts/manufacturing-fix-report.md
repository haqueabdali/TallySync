# Manufacturing Fix Report

Generated: 2026-08-08T23:11:28.991Z

## HIGH (7)

### src/production-scheduling/production-scheduling.controller.ts:106

Method: `complete`

Category: `company-scope`

Critical manufacturing lifecycle method does not show an obvious companyId scope in its data access.

**Recommended fix**

Scope every production order, item, BOM, warehouse, and consumption lookup by companyId. Cross-company references must fail before any mutation.

### src/production-scheduling/production-scheduling.controller.ts:106

Method: `complete`

Category: `idempotency`

Completion-like method has no obvious already-completed guard.

**Recommended fix**

Make completion exactly-once: if already Completed, return the existing order without adding finished stock again. Lock/reload the production order before changing status or stock.

### src/production-scheduling/production-scheduling.service.ts:202

Method: `complete`

Category: `company-scope`

Critical manufacturing lifecycle method does not show an obvious companyId scope in its data access.

**Recommended fix**

Scope every production order, item, BOM, warehouse, and consumption lookup by companyId. Cross-company references must fail before any mutation.

### src/quality-management/quality-management.controller.ts:179

Method: `complete`

Category: `company-scope`

Critical manufacturing lifecycle method does not show an obvious companyId scope in its data access.

**Recommended fix**

Scope every production order, item, BOM, warehouse, and consumption lookup by companyId. Cross-company references must fail before any mutation.

### src/quality-management/quality-management.controller.ts:179

Method: `complete`

Category: `idempotency`

Completion-like method has no obvious already-completed guard.

**Recommended fix**

Make completion exactly-once: if already Completed, return the existing order without adding finished stock again. Lock/reload the production order before changing status or stock.

### src/quality-management/quality-management.service.ts:467

Method: `complete`

Category: `company-scope`

Critical manufacturing lifecycle method does not show an obvious companyId scope in its data access.

**Recommended fix**

Scope every production order, item, BOM, warehouse, and consumption lookup by companyId. Cross-company references must fail before any mutation.

### src/quality-management/quality-management.service.ts:467

Method: `complete`

Category: `idempotency`

Completion-like method has no obvious already-completed guard.

**Recommended fix**

Make completion exactly-once: if already Completed, return the existing order without adding finished stock again. Lock/reload the production order before changing status or stock.
