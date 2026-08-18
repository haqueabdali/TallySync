import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { InventoryAgingPageResponseDto } from './dto/inventory-aging-page-response.dto';
import { InventoryAgingQueryDto } from './dto/inventory-aging-query.dto';
import type { InventoryAgingAuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { InventoryAgingService } from './inventory-aging.service';

@ApiTags('Inventory Aging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.INVENTORY)
@Controller('inventory-aging')
export class InventoryAgingController {
  constructor(private readonly inventoryAgingService: InventoryAgingService) {}

  @Get()
  @ApiOperation({
    summary: 'Get FIFO-based inventory aging by item and warehouse',
  })
  @ApiOkResponse({ type: InventoryAgingPageResponseDto })
  getAging(
    @Req() request: InventoryAgingAuthenticatedRequest,
    @Query() query: InventoryAgingQueryDto,
  ): Promise<InventoryAgingPageResponseDto> {
    return this.inventoryAgingService.getAging(request.user.companyId, query);
  }
}
