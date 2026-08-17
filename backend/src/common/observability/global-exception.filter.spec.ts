import {
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type {
  Response,
} from 'express';

import { GlobalExceptionFilter } from './global-exception.filter';
import type { RequestContextRequest } from './request-context.interface';

function createHost(
  request: RequestContextRequest,
  response: Response,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  it('preserves expected HTTP exception messages', () => {
    const json = jest.fn();
    const status = jest
      .fn()
      .mockReturnValue({
        json,
      });

    const response = {
      status,
      getHeader:
        jest.fn(),
    } as unknown as Response;

    const request = {
      method: 'POST',
      url: '/test',
      originalUrl: '/test',
      requestId: 'req-1',
    } as RequestContextRequest;

    const filter =
      new GlobalExceptionFilter(
        'test',
      );

    filter.catch(
      new BadRequestException(
        'Invalid input',
      ),
      createHost(
        request,
        response,
      ),
    );

    expect(status).toHaveBeenCalledWith(
      400,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message:
          'Invalid input',
        requestId: 'req-1',
      }),
    );
  });

  it('hides unexpected internal error details in production', () => {
  const loggerSpy = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);

  const json = jest.fn();

  const status = jest
    .fn()
    .mockReturnValue({
      json,
    });

  const response = {
    status,
    getHeader: jest.fn(),
  } as unknown as Response;

  const request = {
    method: 'GET',
    url: '/test',
    originalUrl: '/test',
    requestId: 'req-2',
  } as RequestContextRequest;

  const filter =
    new GlobalExceptionFilter(
      'production',
    );

  filter.catch(
    new Error(
      'database password leaked',
    ),
    createHost(
      request,
      response,
    ),
  );

  expect(json).toHaveBeenCalledWith(
    expect.objectContaining({
      statusCode: 500,
      message:
        'An unexpected error occurred',
      requestId: 'req-2',
    }),
  );

  expect(loggerSpy).toHaveBeenCalled();

  loggerSpy.mockRestore();
});
});
