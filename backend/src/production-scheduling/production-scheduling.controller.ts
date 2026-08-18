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
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateProductionScheduleDto } from './dto/create-production-schedule.dto';
import { ProductionScheduleQueryDto } from './dto/production-schedule-query.dto';
import {
  PaginatedProductionSchedulesResponseDto,
  ProductionScheduleResponseDto,
} from './dto/production-schedule-response.dto';
import { RescheduleProductionDto } from './dto/reschedule-production.dto';
import { UpdateProductionScheduleDto } from './dto/update-production-schedule.dto';
import type { AuthenticatedProductionSchedulingRequest } from './interfaces/authenticated-request.interface';
import { ProductionSchedulingService } from './production-scheduling.service';

@ApiTags('Production Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.MANUFACTURING)
@Controller('production-schedules')
export class ProductionSchedulingController {
  constructor(private readonly service: ProductionSchedulingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a planned production schedule' })
  @ApiCreatedResponse({ type: ProductionScheduleResponseDto })
  create(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Body() dto: CreateProductionScheduleDto,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  @Get()
  @ApiOkResponse({ type: PaginatedProductionSchedulesResponseDto })
  findAll(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Query() query: ProductionScheduleQueryDto,
  ): Promise<PaginatedProductionSchedulesResponseDto> {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get('gantt')
  @ApiOperation({ summary: 'Get production schedules for Gantt view' })
  @ApiOkResponse({ type: ProductionScheduleResponseDto, isArray: true })
  gantt(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<ProductionScheduleResponseDto[]> {
    return this.service.gantt(req.user.companyId, dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductionScheduleResponseDto })
  findOne(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductionScheduleResponseDto })
  update(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductionScheduleDto,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.update(req.user.companyId, req.user.id, id, dto);
  }

  @Post(':id/schedule')
  schedule(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.schedule(req.user.companyId, req.user.id, id);
  }

  @Post(':id/start')
  start(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.start(req.user.companyId, req.user.id, id);
  }

  @Post(':id/complete')
  complete(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.complete(req.user.companyId, req.user.id, id);
  }

  @Post(':id/cancel')
  cancel(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.cancel(req.user.companyId, req.user.id, id);
  }

  @Post(':id/reschedule')
  reschedule(
    @Req() req: AuthenticatedProductionSchedulingRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleProductionDto,
  ): Promise<ProductionScheduleResponseDto> {
    return this.service.reschedule(req.user.companyId, req.user.id, id, dto);
  }
}
