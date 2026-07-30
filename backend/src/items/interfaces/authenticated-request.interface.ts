import { Request } from 'express';

export interface JwtUserPayload {
  id: string;
  companyId: string;
  email?: string;
  roleId?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}
