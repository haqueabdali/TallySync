/**
 * src/users/__tests__/roles.guard.spec.ts
 */
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';

const makeCtx = (role: string, requiredRoles: string[] | undefined) => {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockReturnValue(requiredRoles as any);

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
  it('allows all authenticated users when no @Roles() decorator is set', () => {
    const { guard, ctx } = makeCtx('vendor', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role matches exactly', () => {
    const { guard, ctx } = makeCtx('admin', ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user role is one of multiple required roles', () => {
    const { guard, ctx } = makeCtx('company_owner', ['admin', 'company_owner']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user role is not in the required list', () => {
    const { guard, ctx } = makeCtx('vendor', ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows access when required roles array is empty (no restriction)', () => {
    const { guard, ctx } = makeCtx('vendor', []);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
