import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import type { AuthenticatedRequest } from '../management-dashboard/interfaces/authenticated-request.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.REPORTING)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  /** Tenant-scoped business overview for the admin web dashboard. */
  @Get('overview')
  getOverview(
    @Req() request: AuthenticatedRequest,
    @Query('months') months?: string,
  ) {
    if (!request.user.companyId) {
      throw new ForbiddenException('A company context is required');
    }
    return this.dashboardService.getOverview(
      request.user.companyId,
      months ? Number(months) : 6,
    );
  }
}
