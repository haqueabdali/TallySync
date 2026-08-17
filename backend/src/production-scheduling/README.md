# Production Scheduling

New module only. No changes to existing Production Order entities.

The module intentionally stores `productionOrderId` as a UUID reference without
inventing a relation or foreign-key table name. Add a verified FK later only
after inspecting the current Production Order entity/table.

Features:
- planned production schedules
- scheduling lifecycle
- actual start/end timestamps
- rescheduling
- priorities
- optional work-center code
- Gantt-range API
- duplicate open-schedule protection
- company isolation
- soft delete ready entity
- UUID PK
- strict DTO validation
