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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CapacityPlanningService } from './capacity-planning.service';
import { CapacityReportQueryDto } from './dto/capacity-report-query.dto';
import { CapacityReportResponseDto } from './dto/capacity-report-response.dto';
import { CreateWorkCenterDto } from './dto/create-work-center.dto';
import { SetCapacityOverrideDto } from './dto/set-capacity-override.dto';
import { UpdateWorkCenterDto } from './dto/update-work-center.dto';
import { WorkCenterResponseDto } from './dto/work-center-response.dto';
import { WorkCenterCapacityOverrideEntity } from './entities/work-center-capacity-override.entity';
import type { AuthenticatedCapacityPlanningRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Capacity Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('capacity-planning')
export class CapacityPlanningController {
  constructor(
    private readonly service: CapacityPlanningService,
  ) {}

  @Post('work-centers')
  @ApiOperation({ summary: 'Create a work center' })
  @ApiCreatedResponse({ type: WorkCenterResponseDto })
  createWorkCenter(
    @Req() req: AuthenticatedCapacityPlanningRequest,
    @Body() dto: CreateWorkCenterDto,
  ): Promise<WorkCenterResponseDto> {
    return this.service.createWorkCenter(
      req.user.companyId,
      req.user.id,
      dto,
    );
  }

  @Get('work-centers')
  @ApiOperation({ summary: 'List work centers' })
  @ApiOkResponse({
    type: WorkCenterResponseDto,
    isArray: true,
  })
  listWorkCenters(
    @Req() req: AuthenticatedCapacityPlanningRequest,
  ): Promise<WorkCenterResponseDto[]> {
    return this.service.listWorkCenters(
      req.user.companyId,
    );
  }

  @Patch('work-centers/:id')
  @ApiOperation({ summary: 'Update a work center' })
  @ApiOkResponse({ type: WorkCenterResponseDto })
  updateWorkCenter(
    @Req() req: AuthenticatedCapacityPlanningRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkCenterDto,
  ): Promise<WorkCenterResponseDto> {
    return this.service.updateWorkCenter(
      req.user.companyId,
      req.user.id,
      id,
      dto,
    );
  }

  @Post('work-centers/:id/overrides')
  @ApiOperation({
    summary: 'Set or replace capacity for one date',
  })
  setCapacityOverride(
    @Req() req: AuthenticatedCapacityPlanningRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCapacityOverrideDto,
  ): Promise<WorkCenterCapacityOverrideEntity> {
    return this.service.setCapacityOverride(
      req.user.companyId,
      req.user.id,
      id,
      dto,
    );
  }

  @Get('report')
  @ApiOperation({
    summary: 'Capacity, utilization, and bottleneck report',
  })
  @ApiOkResponse({ type: CapacityReportResponseDto })
  getReport(
    @Req() req: AuthenticatedCapacityPlanningRequest,
    @Query() query: CapacityReportQueryDto,
  ): Promise<CapacityReportResponseDto> {
    return this.service.getCapacityReport(
      req.user.companyId,
      query,
    );
  }
}
