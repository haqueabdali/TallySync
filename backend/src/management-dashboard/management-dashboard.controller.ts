import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManagementDashboardFilterDto } from './dto/management-dashboard-filter.dto';
import { ManagementDashboardResponseDto } from './dto/management-dashboard-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ManagementDashboardService } from './management-dashboard.service';

@ApiTags('Management Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('management-dashboard')
export class ManagementDashboardController {
  constructor(
    private readonly managementDashboardService: ManagementDashboardService,
  ) {}

  @Get()
  @ApiOkResponse({ type: ManagementDashboardResponseDto })
  getDashboard(
    @Query() filter: ManagementDashboardFilterDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ManagementDashboardResponseDto> {
    return this.managementDashboardService.getDashboard(
      filter,
      request.user.companyId,
    );
  }
}
