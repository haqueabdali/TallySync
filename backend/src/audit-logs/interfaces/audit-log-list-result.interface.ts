import type { AuditLogEntity } from '../../users/entities/audit-log.entity';

export interface AuditLogListResult {
  data: AuditLogEntity[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
