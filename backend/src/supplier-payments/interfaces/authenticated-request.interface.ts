import type { Request } from 'express';

export interface SupplierPaymentJwtUser {
  id: string;
  companyId: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user: SupplierPaymentJwtUser;
}
