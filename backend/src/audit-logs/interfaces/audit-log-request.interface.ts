import type { Request } from 'express';

export interface AuditLogJwtUser {
  id: string;
  companyId: string;
  email?: string;
  role?: string;
}

export interface AuditLogAuthenticatedRequest extends Request {
  user: AuditLogJwtUser;
}
