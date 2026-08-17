import type { Request } from 'express';

export interface ProductionSchedulingUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedProductionSchedulingRequest extends Request {
  user: ProductionSchedulingUser;
}
