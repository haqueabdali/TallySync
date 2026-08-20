import { ForbiddenException, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PlatformAdminGuard } from './platform-admin.guard';

function contextFor(user?: Partial<AuthenticatedUser>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('allows only the company-less admin platform owner', () => {
    expect(
      guard.canActivate(contextFor({ role: 'admin', companyId: null })),
    ).toBe(true);
  });

  it('rejects a customer administrator with a company assignment', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ role: 'admin', companyId: 'customer-company-1' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects a normal company-less user', () => {
    expect(() =>
      guard.canActivate(contextFor({ role: 'sales_rep', companyId: null })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a request without an authenticated user', () => {
    expect(() => guard.canActivate(contextFor())).toThrow(
      'No authenticated user on request',
    );
  });
});
