import { Request } from 'express';

export interface JwtUser {
  id: string;
  companyId: string;
  email: string;
  roleId: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}