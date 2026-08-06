import type { Request } from 'express';
export interface InventoryCostJwtUser { id: string; companyId: string; }
export interface AuthenticatedRequest extends Request { user: InventoryCostJwtUser; }
