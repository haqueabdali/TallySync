import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

const makeContext = (role: string, requiredRoles: string[] | undefined) => {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles as any);

  const ctx = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u1', role } }),
    }),
  } as unknown as ExecutionContext;

  return { guard: new RolesGuard(reflector), ctx };
};

describe('RolesGuard', () => {
  it('allows access when no @Roles() decorator is present', () => {
    const { guard, ctx } = makeContext('sales_rep', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role matches the required role', () => {
    const { guard, ctx } = makeContext('admin', ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role is one of multiple required roles', () => {
    const { guard, ctx } = makeContext('company_owner', ['admin', 'company_owner']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user role is not in the required list', () => {
    const { guard, ctx } = makeContext('sales_rep', ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when required roles array is empty', () => {
    // empty array — treat as no restriction  
    const { guard, ctx } = makeContext('sales_rep', []);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
