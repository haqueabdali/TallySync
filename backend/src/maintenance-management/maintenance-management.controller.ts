import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CompleteMaintenanceWorkOrderDto } from './dto/complete-maintenance-work-order.dto';
import { CreateDowntimeLogDto } from './dto/create-downtime-log.dto';
import { CreateMaintenanceAssetDto } from './dto/create-maintenance-asset.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { CreateMaintenanceWorkOrderDto } from './dto/create-maintenance-work-order.dto';
import { MaintenanceReportQueryDto } from './dto/maintenance-report-query.dto';
import { MaintenanceReportResponseDto } from './dto/maintenance-report-response.dto';
import { UpdateMaintenanceAssetDto } from './dto/update-maintenance-asset.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { MaintenanceAssetEntity } from './entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from './entities/maintenance-downtime.entity';
import { MaintenancePlanEntity } from './entities/maintenance-plan.entity';
import { MaintenanceWorkOrderEntity } from './entities/maintenance-work-order.entity';
import type { AuthenticatedMaintenanceManagementRequest } from './interfaces/authenticated-request.interface';
import { MaintenanceManagementService } from './maintenance-management.service';

@ApiTags('Maintenance Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.MANUFACTURING)
@Controller('maintenance')
export class MaintenanceManagementController {
  constructor(private readonly service: MaintenanceManagementService) {}

  @Post('assets')
  createAsset(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Body() dto: CreateMaintenanceAssetDto,
  ): Promise<MaintenanceAssetEntity> {
    return this.service.createAsset(req.user.companyId, req.user.id, dto);
  }

  @Get('assets')
  listAssets(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
  ): Promise<MaintenanceAssetEntity[]> {
    return this.service.listAssets(req.user.companyId);
  }

  @Patch('assets/:id')
  updateAsset(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceAssetDto,
  ): Promise<MaintenanceAssetEntity> {
    return this.service.updateAsset(req.user.companyId, req.user.id, id, dto);
  }

  @Post('plans')
  createPlan(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Body() dto: CreateMaintenancePlanDto,
  ): Promise<MaintenancePlanEntity> {
    return this.service.createPlan(req.user.companyId, req.user.id, dto);
  }

  @Patch('plans/:id')
  updatePlan(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenancePlanDto,
  ): Promise<MaintenancePlanEntity> {
    return this.service.updatePlan(req.user.companyId, req.user.id, id, dto);
  }

  @Post('work-orders')
  createWorkOrder(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Body() dto: CreateMaintenanceWorkOrderDto,
  ): Promise<MaintenanceWorkOrderEntity> {
    return this.service.createWorkOrder(req.user.companyId, req.user.id, dto);
  }

  @Post('work-orders/:id/start')
  startWorkOrder(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceWorkOrderEntity> {
    return this.service.startWorkOrder(req.user.companyId, req.user.id, id);
  }

  @Post('work-orders/:id/complete')
  completeWorkOrder(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteMaintenanceWorkOrderDto,
  ): Promise<MaintenanceWorkOrderEntity> {
    return this.service.completeWorkOrder(
      req.user.companyId,
      req.user.id,
      id,
      dto,
    );
  }

  @Post('downtime')
  createDowntime(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Body() dto: CreateDowntimeLogDto,
  ): Promise<MaintenanceDowntimeEntity> {
    return this.service.createDowntime(req.user.companyId, req.user.id, dto);
  }

  @Post('downtime/:id/close')
  closeDowntime(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceDowntimeEntity> {
    return this.service.closeDowntime(req.user.companyId, req.user.id, id);
  }

  @Get('report')
  @ApiOperation({ summary: 'Maintenance KPI report' })
  report(
    @Req() req: AuthenticatedMaintenanceManagementRequest,
    @Query() query: MaintenanceReportQueryDto,
  ): Promise<MaintenanceReportResponseDto> {
    return this.service.getReport(req.user.companyId, query);
  }
}
