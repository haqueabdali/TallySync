import type { Request } from 'express';

export interface InventoryValuationJwtUser {
  id: string;
  companyId: string;
}

export interface InventoryValuationAuthenticatedRequest extends Request {
  user: InventoryValuationJwtUser;
}
