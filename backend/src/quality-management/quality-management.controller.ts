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
import { CompleteQualityInspectionDto } from './dto/complete-quality-inspection.dto';
import { CreateQualityInspectionDto } from './dto/create-quality-inspection.dto';
import { QualityInspectionQueryDto } from './dto/quality-inspection-query.dto';
import {
  PaginatedQualityInspectionsResponseDto,
  QualityInspectionCheckResponseDto,
  QualityInspectionResponseDto,
} from './dto/quality-inspection-response.dto';
import { QualityReportQueryDto } from './dto/quality-report-query.dto';
import { QualityReportResponseDto } from './dto/quality-report-response.dto';
import { RecordQualityCheckResultDto } from './dto/record-quality-check-result.dto';
import { UpdateQualityInspectionDto } from './dto/update-quality-inspection.dto';
import type { AuthenticatedQualityManagementRequest } from './interfaces/authenticated-request.interface';
import { QualityManagementService } from './quality-management.service';

@ApiTags('Quality Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.MANUFACTURING)
@Controller('quality-inspections')
export class QualityManagementController {
  constructor(private readonly service: QualityManagementService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a draft quality inspection',
  })
  @ApiCreatedResponse({
    type: QualityInspectionResponseDto,
  })
  create(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Body()
    dto: CreateQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  @Get()
  @ApiOkResponse({
    type: PaginatedQualityInspectionsResponseDto,
  })
  findAll(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Query()
    query: QualityInspectionQueryDto,
  ): Promise<PaginatedQualityInspectionsResponseDto> {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get('report')
  @ApiOperation({
    summary: 'Quality KPI report',
  })
  @ApiOkResponse({
    type: QualityReportResponseDto,
  })
  report(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Query()
    query: QualityReportQueryDto,
  ): Promise<QualityReportResponseDto> {
    return this.service.getReport(req.user.companyId, query);
  }

  @Get(':id')
  @ApiOkResponse({
    type: QualityInspectionResponseDto,
  })
  findOne(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<QualityInspectionResponseDto> {
    return this.service.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  @ApiOkResponse({
    type: QualityInspectionResponseDto,
  })
  update(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
    @Body()
    dto: UpdateQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    return this.service.update(req.user.companyId, req.user.id, id, dto);
  }

  @Post(':id/start')
  start(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<QualityInspectionResponseDto> {
    return this.service.start(req.user.companyId, req.user.id, id);
  }

  @Patch(':inspectionId/checks/:checkId/result')
  @ApiOkResponse({
    type: QualityInspectionCheckResponseDto,
  })
  recordCheckResult(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Param('inspectionId', ParseUUIDPipe)
    inspectionId: string,
    @Param('checkId', ParseUUIDPipe)
    checkId: string,
    @Body()
    dto: RecordQualityCheckResultDto,
  ): Promise<QualityInspectionCheckResponseDto> {
    return this.service.recordCheckResult(
      req.user.companyId,
      req.user.id,
      inspectionId,
      checkId,
      dto,
    );
  }

  @Post(':id/complete')
  complete(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
    @Body()
    dto: CompleteQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    return this.service.complete(req.user.companyId, req.user.id, id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Req()
    req: AuthenticatedQualityManagementRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<QualityInspectionResponseDto> {
    return this.service.cancel(req.user.companyId, req.user.id, id);
  }
}
