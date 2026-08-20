import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateManualCostAdjustmentDto } from './dto/create-manual-cost-adjustment.dto';
import { ManualCostAdjustmentFilterDto } from './dto/manual-cost-adjustment-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ManualCostAdjustmentsService } from './manual-cost-adjustments.service';

@ApiTags('Manual Cost Adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.INVENTORY)
@Controller('manual-cost-adjustments')
export class ManualCostAdjustmentsController {
  constructor(private readonly service: ManualCostAdjustmentsService) {}
  @Post()
  @ApiOperation({ summary: 'Create a draft manual cost adjustment' })
  create(
    @Body() dto: CreateManualCostAdjustmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.create(dto, request.user.companyId, request.user.id);
  }
  @Get()
  @ApiOperation({ summary: 'List manual cost adjustments' })
  findAll(
    @Query() filter: ManualCostAdjustmentFilterDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.findAll(filter, request.user.companyId);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a manual cost adjustment' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, request.user.companyId);
  }
  @Post(':id/post')
  @ApiOperation({ summary: 'Post a manual cost adjustment' })
  post(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.post(id, request.user.companyId, request.user.id);
  }
}
