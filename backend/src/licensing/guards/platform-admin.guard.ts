import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    if (user.role !== 'admin' || user.companyId !== null) {
      throw new ForbiddenException('Platform administrator access required');
    }

    return true;
  }
}
