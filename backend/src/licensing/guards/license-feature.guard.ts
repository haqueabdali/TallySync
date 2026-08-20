import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { REQUIRED_LICENSE_FEATURE_KEY } from '../decorators/require-license-feature.decorator';
import { LicensedFeature } from '../enums/licensed-feature.enum';
import { LicensingService } from '../licensing.service';

@Injectable()
export class LicenseFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licensingService: LicensingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<LicensedFeature>(
      REQUIRED_LICENSE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    if (user.role === 'admin' && user.companyId === null) {
      return true;
    }

    if (!user.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    await this.licensingService.assertFeatureEnabled(
      user.companyId,
      requiredFeature,
    );
    return true;
  }
}
