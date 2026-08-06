import type { Request } from 'express';

export interface StockLedgerJwtUser {
  id: string;
  companyId: string;
}

export interface StockLedgerAuthenticatedRequest extends Request {
  user: StockLedgerJwtUser;
}
