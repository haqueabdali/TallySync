export interface AuditContext {
  actorId: string;
  companyId: string;
  ipAddress?: string;
  userAgent?: string;
}