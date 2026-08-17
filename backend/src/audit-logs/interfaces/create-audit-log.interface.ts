import type { AuditAction } from '../../users/entities/audit-log.entity';

export interface CreateAuditLogInput {
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
