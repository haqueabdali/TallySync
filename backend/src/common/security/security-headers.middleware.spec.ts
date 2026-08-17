import type { NextFunction, Request, Response } from 'express';
import { securityHeadersMiddleware } from './security-headers.middleware';

describe('securityHeadersMiddleware', () => {
  it('sets baseline security headers', () => {
    const setHeader = jest.fn();
    const next: NextFunction = jest.fn();
    const response = { setHeader } as unknown as Response;

    securityHeadersMiddleware({} as Request, response, next);

    expect(setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
