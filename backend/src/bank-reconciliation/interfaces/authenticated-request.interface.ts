import type { Request } from 'express';
export interface BankReconciliationJwtUser { id: string; companyId: string; }
export interface AuthenticatedRequest extends Request { user: BankReconciliationJwtUser; }
