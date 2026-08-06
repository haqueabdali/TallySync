import type { Request } from 'express';
export interface DepreciationJwtUser { id: string; companyId: string; }
export interface AuthenticatedRequest extends Request { user: DepreciationJwtUser; }
