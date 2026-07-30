import type { Request } from 'express';
export interface SupplierJwtUser { id: string; companyId: string; email?: string; role?: string; }
export interface AuthenticatedRequest extends Request { user: SupplierJwtUser; }
