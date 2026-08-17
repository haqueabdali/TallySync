import type { Request } from 'express';

export interface CostingVarianceUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedCostingVarianceRequest extends Request {
  user: CostingVarianceUser;
}
