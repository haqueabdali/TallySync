import type { Request } from 'express';

export interface AccountJwtUser {
  id: string;
  companyId: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AccountJwtUser;
}
