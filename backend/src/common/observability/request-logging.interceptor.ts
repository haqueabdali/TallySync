import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type {
  Response,
} from 'express';
import type {
  Observable,
} from 'rxjs';
import { finalize } from 'rxjs/operators';

import type { RequestContextRequest } from './request-context.interface';

interface RequestLogEntry {
  event: 'http_request';
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userAgent: string | null;
  ip: string | null;
  slow: boolean;
}

@Injectable()
export class RequestLoggingInterceptor
  implements NestInterceptor
{
  private readonly logger =
    new Logger('HttpAccess');

  private readonly slowRequestMs: number;

  constructor(
    slowRequestMs?: number,
  ) {
    this.slowRequestMs =
      Number.isFinite(slowRequestMs) &&
      Number(slowRequestMs) > 0
        ? Number(slowRequestMs)
        : 1_500;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const http =
      context.switchToHttp();

    const request =
      http.getRequest<RequestContextRequest>();

    const response =
      http.getResponse<Response>();

    const startedAt =
      request.requestStartedAt ??
      Date.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs =
          Date.now() - startedAt;

        const requestId =
          request.requestId ??
          'unknown';

        const entry: RequestLogEntry = {
          event: 'http_request',
          requestId,
          method: request.method,
          path:
            request.originalUrl ??
            request.url,
          statusCode:
            response.statusCode,
          durationMs,
          userAgent:
            request.get('user-agent') ??
            null,
          ip:
            request.ip ??
            null,
          slow:
            durationMs >=
            this.slowRequestMs,
        };

        const serialized =
          JSON.stringify(entry);

        if (entry.slow) {
          this.logger.warn(serialized);
        } else {
          this.logger.log(serialized);
        }
      }),
    );
  }
}
