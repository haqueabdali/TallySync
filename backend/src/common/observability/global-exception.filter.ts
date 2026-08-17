import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type {
  Request,
  Response,
} from 'express';

import type { RequestContextRequest } from './request-context.interface';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message:
    | string
    | string[];
  path: string;
  timestamp: string;
  requestId: string;
}

interface HttpExceptionObject {
  message?: unknown;
  error?: unknown;
  statusCode?: unknown;
}

@Catch()
export class GlobalExceptionFilter
  implements ExceptionFilter
{
  private readonly logger =
    new Logger(GlobalExceptionFilter.name);

  constructor(
    private readonly nodeEnv:
      | 'development'
      | 'test'
      | 'production',
  ) {}

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const context =
      host.switchToHttp();

    const request =
      context.getRequest<RequestContextRequest>();

    const response =
      context.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId =
      request.requestId ??
      String(
        response.getHeader(
          'x-request-id',
        ) ?? 'unknown',
      );

    const errorBody =
      this.buildErrorBody(
        exception,
        statusCode,
        request,
        requestId,
      );

    if (
      statusCode >= HttpStatus.INTERNAL_SERVER_ERROR &&
      this.nodeEnv !== 'test'
    ) {
      const logEntry = {
        event: 'unhandled_exception',
        requestId,
        method: request.method,
        path:
          request.originalUrl ??
          request.url,
        statusCode,
        error:
          exception instanceof Error
            ? exception.name
            : 'UnknownError',
        message:
          exception instanceof Error
            ? exception.message
            : 'Unknown error',
        stack:
          this.nodeEnv ===
          'production'
            ? undefined
            : exception instanceof Error
              ? exception.stack
              : undefined,
      };

      this.logger.error(
        JSON.stringify(logEntry),
      );
    }

    response
      .status(statusCode)
      .json(errorBody);
  }

  private buildErrorBody(
    exception: unknown,
    statusCode: number,
    request: Request,
    requestId: string,
  ): ErrorResponseBody {
    if (
      exception instanceof
      HttpException
    ) {
      const exceptionResponse =
        exception.getResponse();

      if (
        typeof exceptionResponse ===
        'string'
      ) {
        return {
          statusCode,
          error:
            HttpStatus[
              statusCode
            ] ?? 'Error',
          message:
            exceptionResponse,
          path:
            request.originalUrl ??
            request.url,
          timestamp:
            new Date().toISOString(),
          requestId,
        };
      }

      const typedResponse =
        exceptionResponse as HttpExceptionObject;

      return {
        statusCode,
        error:
          typeof typedResponse.error ===
          'string'
            ? typedResponse.error
            : HttpStatus[
                statusCode
              ] ?? 'Error',
        message:
          this.normalizeMessage(
            typedResponse.message,
            exception.message,
          ),
        path:
          request.originalUrl ??
          request.url,
        timestamp:
          new Date().toISOString(),
        requestId,
      };
    }

    return {
      statusCode,
      error:
        'Internal Server Error',
      message:
        this.nodeEnv ===
        'production'
          ? 'An unexpected error occurred'
          : exception instanceof Error
            ? exception.message
            : 'Unknown error',
      path:
        request.originalUrl ??
        request.url,
      timestamp:
        new Date().toISOString(),
      requestId,
    };
  }

  private normalizeMessage(
    value: unknown,
    fallback: string,
  ): string | string[] {
    if (typeof value === 'string') {
      return value;
    }

    if (
      Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === 'string',
      )
    ) {
      return value;
    }

    return fallback;
  }
}
