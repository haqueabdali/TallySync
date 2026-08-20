import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { CalculateProductionVarianceDto } from './dto/calculate-production-variance.dto';
import { ProductionVarianceFilterDto } from './dto/production-variance-filter.dto';
import { UpsertProductionVarianceSettingsDto } from './dto/upsert-production-variance-settings.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ProductionVarianceService } from './production-variance.service';

@ApiTags('Production Variance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.COSTING)
@Controller('production-variances')
export class ProductionVarianceController {
  constructor(private readonly service: ProductionVarianceService) {}

  @Get('settings')
  @ApiOkResponse()
  getSettings(@Req() request: AuthenticatedRequest) {
    return this.service.getSettings(request.user.companyId);
  }

  @Put('settings')
  @ApiOkResponse()
  upsertSettings(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpsertProductionVarianceSettingsDto,
  ) {
    return this.service.upsertSettings(
      request.user.companyId,
      request.user.id,
      dto,
    );
  }

  @Post('production-orders/:productionOrderId/calculate')
  @ApiOperation({
    summary:
      'Calculate usage and WIP variance for a completed production order',
  })
  @ApiCreatedResponse()
  calculate(
    @Req() request: AuthenticatedRequest,
    @Param('productionOrderId', ParseUUIDPipe) productionOrderId: string,
    @Body() dto: CalculateProductionVarianceDto,
  ) {
    return this.service.calculate(
      request.user.companyId,
      request.user.id,
      productionOrderId,
      dto,
    );
  }

  @Post(':id/post')
  @ApiOkResponse()
  post(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.post(request.user.companyId, request.user.id, id);
  }

  @Get()
  @ApiOkResponse()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() filter: ProductionVarianceFilterDto,
  ) {
    return this.service.list(request.user.companyId, filter);
  }

  @Get(':id')
  @ApiOkResponse()
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(request.user.companyId, id);
  }
}
