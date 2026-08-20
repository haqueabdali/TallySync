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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateInventoryRevaluationDto } from './dto/create-inventory-revaluation.dto';
import { InventoryRevaluationFilterDto } from './dto/inventory-revaluation-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { InventoryRevaluationService } from './inventory-revaluation.service';
@RequireLicenseFeature(LicensedFeature.INVENTORY)
@ApiTags('Inventory Revaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@Controller('inventory-revaluations')
export class InventoryRevaluationController {
  constructor(private readonly service: InventoryRevaluationService) {}
  @Post() create(
    @Body() dto: CreateInventoryRevaluationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.companyId, req.user.userId);
  }
  @Get() findAll(
    @Query() filter: InventoryRevaluationFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(filter, req.user.companyId);
  }
  @Get(':id') findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.companyId);
  }
  @Post(':id/post') post(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.post(id, req.user.companyId, req.user.userId);
  }
}
