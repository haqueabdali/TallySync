import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const makeContext = (
  role: string | undefined,
  requiredRoles: string[] | undefined,
) => {
  const reflector = new Reflector();

  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

  const ctx = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: role ? { id: 'u1', role } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;

  return {
    guard: new RolesGuard(reflector),
    ctx,
  };
};

describe('RolesGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows access when no @Roles() decorator is present', () => {
    const { guard, ctx } = makeContext('sales_rep', undefined);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the required roles array is empty', () => {
    const { guard, ctx } = makeContext('sales_rep', []);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the user role matches the required role', () => {
    const { guard, ctx } = makeContext('admin', ['admin']);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the user role is one of several required roles', () => {
    const { guard, ctx } = makeContext('company_owner', [
      'admin',
      'company_owner',
    ]);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when the user role is not allowed', () => {
    const { guard, ctx } = makeContext('sales_rep', ['admin']);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when request.user is missing', () => {
    const { guard, ctx } = makeContext(undefined, ['admin']);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
