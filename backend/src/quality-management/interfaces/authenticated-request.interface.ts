import type { Request } from 'express';

export interface QualityManagementUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedQualityManagementRequest
  extends Request {
  user: QualityManagementUser;
}
