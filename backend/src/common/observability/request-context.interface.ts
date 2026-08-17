import type { Request } from 'express';

export interface RequestContextRequest extends Request {
  requestId?: string;
  requestStartedAt?: number;
}
