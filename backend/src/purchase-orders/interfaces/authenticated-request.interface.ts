import type { Request } from 'express';
export interface PurchaseOrderJwtUser { id: string; companyId: string; email?: string; role?: string; }
export interface AuthenticatedRequest extends Request { user: PurchaseOrderJwtUser; }
