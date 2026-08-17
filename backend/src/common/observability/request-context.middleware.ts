import { randomUUID } from 'crypto';
import type {
  NextFunction,
  Response,
} from 'express';

import type { RequestContextRequest } from './request-context.interface';

const REQUEST_ID_HEADER = 'x-request-id';

export function requestContextMiddleware(
  request: RequestContextRequest,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId =
    request.header(REQUEST_ID_HEADER)?.trim();

  const requestId =
    incomingRequestId &&
    incomingRequestId.length <= 128
      ? incomingRequestId
      : randomUUID();

  request.requestId = requestId;
  request.requestStartedAt = Date.now();

  response.setHeader(
    REQUEST_ID_HEADER,
    requestId,
  );

  next();
}
