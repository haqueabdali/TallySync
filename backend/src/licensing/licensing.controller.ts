import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { LicensingService } from './licensing.service';

@ApiTags('Licensing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('licensing')
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'Get current company entitlement for application module visibility',
  })
  entitlement(@CurrentUser() user: AuthenticatedUser) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }
    return this.licensingService.getCompanyEntitlement(user.companyId);
  }

  @Get('me/certificate')
  @ApiOperation({
    summary: 'Get the current company signed license certificate',
  })
  certificate(@CurrentUser() user: AuthenticatedUser) {
    if (!user.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }
    return this.licensingService.getSignedCertificateForCompany(user.companyId);
  }

  @Get('me/version/:version')
  @ApiOperation({
    summary: 'Check whether an application version is authorized',
  })
  async version(
    @CurrentUser() user: AuthenticatedUser,
    @Param('version') version: string,
  ): Promise<{ authorized: true; version: string }> {
    if (!user.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }
    await this.licensingService.assertVersionAuthorized(
      user.companyId,
      version,
    );
    return { authorized: true, version };
  }
}
