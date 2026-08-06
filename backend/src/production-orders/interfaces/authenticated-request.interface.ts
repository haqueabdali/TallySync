import type { Request } from 'express';

export interface AuthenticatedProductionOrderRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}
