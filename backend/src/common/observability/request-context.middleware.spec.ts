import type {
  NextFunction,
  Response,
} from 'express';

import type { RequestContextRequest } from './request-context.interface';
import { requestContextMiddleware } from './request-context.middleware';

describe('requestContextMiddleware', () => {
  it('preserves a valid incoming request ID', () => {
    const request = {
      header: jest
        .fn()
        .mockReturnValue(
          'external-request-id',
        ),
    } as unknown as RequestContextRequest;

    const setHeader =
      jest.fn();

    const response = {
      setHeader,
    } as unknown as Response;

    const next:
      NextFunction = jest.fn();

    requestContextMiddleware(
      request,
      response,
      next,
    );

    expect(request.requestId).toBe(
      'external-request-id',
    );

    expect(setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'external-request-id',
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates an ID when none is supplied', () => {
    const request = {
      header: jest
        .fn()
        .mockReturnValue(undefined),
    } as unknown as RequestContextRequest;

    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;

    const next:
      NextFunction = jest.fn();

    requestContextMiddleware(
      request,
      response,
      next,
    );

    expect(
      typeof request.requestId,
    ).toBe('string');

    expect(
      request.requestId?.length,
    ).toBeGreaterThan(0);

    expect(
      typeof request.requestStartedAt,
    ).toBe('number');
  });
});
