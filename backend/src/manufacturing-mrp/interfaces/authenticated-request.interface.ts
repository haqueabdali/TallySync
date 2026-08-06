import type { Request } from 'express';

export interface ManufacturingMrpJwtUser {
  id: string;
  companyId: string;
}

export interface AuthenticatedRequest extends Request {
  user: ManufacturingMrpJwtUser;
}
