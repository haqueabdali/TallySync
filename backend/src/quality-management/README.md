# Quality Management

Self-contained quality-control module.

Features:
- Draft/in-progress/completed inspection lifecycle
- Production, goods receipt, inventory, and manual source references
- Generic UUID `sourceId` without inventing foreign keys
- Item/warehouse references without assuming entity relations
- Numeric tolerance checks
- Text conformance checks
- Mandatory/optional checks
- Automatic PASS/FAIL evaluation
- Accepted/rejected quantity controls
- Failure reason enforcement
- Quality KPI reporting
- Company isolation
- UUID PKs
- Soft-delete inspection documents

No Production Order, Goods Receipt, Item, or Warehouse entity is modified.
