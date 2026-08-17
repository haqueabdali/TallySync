import type { Request } from 'express';
export interface AssetDisposalJwtUser { id: string; companyId: string; }
export interface AuthenticatedRequest extends Request { user: AssetDisposalJwtUser; }
