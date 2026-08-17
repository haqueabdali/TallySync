import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvancedReportingService } from './advanced-reporting.service';
import { AdvancedReportQueryDto } from './dto/advanced-report-query.dto';
import { ManufacturingDashboardResponseDto } from './dto/manufacturing-dashboard-response.dto';
import { MaintenancePerformanceResponseDto } from './dto/maintenance-performance-response.dto';
import { ProductionPerformanceResponseDto } from './dto/production-performance-response.dto';
import { QualityPerformanceResponseDto } from './dto/quality-performance-response.dto';
import type { AuthenticatedAdvancedReportingRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Advanced Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('advanced-reporting')
export class AdvancedReportingController {
  constructor(
    private readonly service:
      AdvancedReportingService,
  ) {}

  @Get('production')
  @ApiOperation({
    summary:
      'Production performance report',
  })
  @ApiOkResponse({
    type: ProductionPerformanceResponseDto,
  })
  production(
    @Req()
    req: AuthenticatedAdvancedReportingRequest,
    @Query()
    query: AdvancedReportQueryDto,
  ): Promise<ProductionPerformanceResponseDto> {
    return this.service.getProductionPerformance(
      req.user.companyId,
      query,
    );
  }

  @Get('quality')
  @ApiOperation({
    summary:
      'Quality performance report',
  })
  @ApiOkResponse({
    type: QualityPerformanceResponseDto,
  })
  quality(
    @Req()
    req: AuthenticatedAdvancedReportingRequest,
    @Query()
    query: AdvancedReportQueryDto,
  ): Promise<QualityPerformanceResponseDto> {
    return this.service.getQualityPerformance(
      req.user.companyId,
      query,
    );
  }

  @Get('maintenance')
  @ApiOperation({
    summary:
      'Maintenance performance report',
  })
  @ApiOkResponse({
    type: MaintenancePerformanceResponseDto,
  })
  maintenance(
    @Req()
    req: AuthenticatedAdvancedReportingRequest,
    @Query()
    query: AdvancedReportQueryDto,
  ): Promise<MaintenancePerformanceResponseDto> {
    return this.service.getMaintenancePerformance(
      req.user.companyId,
      query,
    );
  }

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Executive manufacturing dashboard',
  })
  @ApiOkResponse({
    type: ManufacturingDashboardResponseDto,
  })
  dashboard(
    @Req()
    req: AuthenticatedAdvancedReportingRequest,
    @Query()
    query: AdvancedReportQueryDto,
  ): Promise<ManufacturingDashboardResponseDto> {
    return this.service.getDashboard(
      req.user.companyId,
      query,
    );
  }
}
