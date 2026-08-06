import type { Request } from 'express';

export interface AuthenticatedBillOfMaterialRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}
