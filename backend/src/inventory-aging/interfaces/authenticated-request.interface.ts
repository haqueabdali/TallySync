import type { Request } from 'express';

export interface InventoryAgingAuthenticatedRequest extends Request {
  user: {
    userId: string;
    companyId: string;
  };
}
