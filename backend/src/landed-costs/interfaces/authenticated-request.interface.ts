import { Request } from 'express';

export interface LandedCostJwtUser {
  id: string;
  companyId: string;
  email?: string;
  roles?: string[];
}

export interface AuthenticatedLandedCostRequest extends Request {
  user: LandedCostJwtUser;
}
