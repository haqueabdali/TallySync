import type { AuditAction } from '../../users/entities/audit-log.entity';

export interface AuditActionSummary {
  action: AuditAction;
  count: number;
}

export interface AuditEntityTypeSummary {
  entityType: string;
  count: number;
}

export interface AuditLogSummary {
  total: number;
  byAction: AuditActionSummary[];
  byEntityType: AuditEntityTypeSummary[];
}
