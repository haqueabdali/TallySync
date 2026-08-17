# Capacity Planning

This module depends only on the Production Scheduling module.

It introduces:
- Work Center master data
- Daily nominal capacity
- Efficiency percentage
- Working weekdays
- Date-specific capacity overrides/shutdowns
- Scheduled load calculation
- Available capacity
- Utilization %
- Overload minutes
- Bottleneck-day detection
- Company-scoped capacity reporting

It does not invent relations to Production Orders, BOMs, routings, machines,
or assets. Production load is derived from the verified
`ProductionScheduleEntity.workCenterCode` field.
