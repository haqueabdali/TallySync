import type { Request } from 'express';

export interface CapacityPlanningUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedCapacityPlanningRequest extends Request {
  user: CapacityPlanningUser;
}
