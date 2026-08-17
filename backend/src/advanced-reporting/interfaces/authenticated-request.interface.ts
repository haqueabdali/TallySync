import type { Request } from 'express';

export interface AdvancedReportingUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedAdvancedReportingRequest
  extends Request {
  user: AdvancedReportingUser;
}
