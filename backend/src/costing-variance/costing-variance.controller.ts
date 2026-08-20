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
import { CostingVarianceService } from './costing-variance.service';
import { CostingAnalysisQueryDto } from './dto/costing-analysis-query.dto';
import {
  CostingVarianceSummaryResponseDto,
  PaginatedCostingVarianceResponseDto,
} from './dto/costing-variance-response.dto';
import { CreateProductionCostAnalysisDto } from './dto/create-production-cost-analysis.dto';
import { ProfitabilityReportQueryDto } from './dto/profitability-report-query.dto';
import { ProfitabilityReportResponseDto } from './dto/profitability-report-response.dto';
import { UpdateProductionCostAnalysisDto } from './dto/update-production-cost-analysis.dto';
import type { AuthenticatedCostingVarianceRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Costing & Variance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.COSTING)
@Controller('costing-variance')
export class CostingVarianceController {
  constructor(private readonly service: CostingVarianceService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a production costing snapshot',
  })
  @ApiCreatedResponse({
    type: CostingVarianceSummaryResponseDto,
  })
  create(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Body()
    dto: CreateProductionCostAnalysisDto,
  ): Promise<CostingVarianceSummaryResponseDto> {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  @Get()
  @ApiOkResponse({
    type: PaginatedCostingVarianceResponseDto,
  })
  findAll(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Query()
    query: CostingAnalysisQueryDto,
  ): Promise<PaginatedCostingVarianceResponseDto> {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get('profitability')
  @ApiOperation({
    summary: 'Production profitability report',
  })
  @ApiOkResponse({
    type: ProfitabilityReportResponseDto,
  })
  profitability(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Query()
    query: ProfitabilityReportQueryDto,
  ): Promise<ProfitabilityReportResponseDto> {
    return this.service.getProfitabilityReport(req.user.companyId, query);
  }

  @Get(':id')
  @ApiOkResponse({
    type: CostingVarianceSummaryResponseDto,
  })
  findOne(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<CostingVarianceSummaryResponseDto> {
    return this.service.findOne(req.user.companyId, id);
  }

  @Patch(':id')
  @ApiOkResponse({
    type: CostingVarianceSummaryResponseDto,
  })
  update(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
    @Body()
    dto: UpdateProductionCostAnalysisDto,
  ): Promise<CostingVarianceSummaryResponseDto> {
    return this.service.update(req.user.companyId, req.user.id, id, dto);
  }

  @Post(':id/finalize')
  finalize(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<CostingVarianceSummaryResponseDto> {
    return this.service.finalize(req.user.companyId, req.user.id, id);
  }

  @Post(':id/cancel')
  cancel(
    @Req()
    req: AuthenticatedCostingVarianceRequest,
    @Param('id', ParseUUIDPipe)
    id: string,
  ): Promise<CostingVarianceSummaryResponseDto> {
    return this.service.cancel(req.user.companyId, req.user.id, id);
  }
}
