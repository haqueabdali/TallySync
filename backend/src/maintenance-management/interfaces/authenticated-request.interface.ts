import type { Request } from 'express';

export interface MaintenanceManagementUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedMaintenanceManagementRequest extends Request {
  user: MaintenanceManagementUser;
}
