import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';

function makeContext(
  role: string,
  requiredRoles: string[] | undefined,
): {
  guard: RolesGuard;
  context: ExecutionContext;
} {
  const reflector = new Reflector();

  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockReturnValue(requiredRoles);

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user-uuid-1',
          companyId: 'company-uuid-1',
          email: 'user@example.com',
          fullName: 'Test User',
          role,
        },
      }),
    }),
  } as unknown as ExecutionContext;

  return {
    guard: new RolesGuard(reflector),
    context,
  };
}

describe('RolesGuard', () => {
  it('allows access when no roles metadata exists', () => {
    const { guard, context } = makeContext(
      'sales_rep',
      undefined,
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user has the required role', () => {
    const { guard, context } = makeContext(
      'admin',
      ['admin'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the role matches one of several roles', () => {
    const { guard, context } = makeContext(
      'company_owner',
      ['admin', 'company_owner'],
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws when the user lacks the required role', () => {
    const { guard, context } = makeContext(
      'sales_rep',
      ['admin'],
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('allows access when the required roles array is empty', () => {
    const { guard, context } = makeContext(
      'sales_rep',
      [],
    );

    expect(guard.canActivate(context)).toBe(true);
  });
});
