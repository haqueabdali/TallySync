import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryValuationPageResponseDto } from './dto/inventory-valuation-page-response.dto';
import { InventoryValuationQueryDto } from './dto/inventory-valuation-query.dto';
import type { InventoryValuationAuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { InventoryValuationService } from './inventory-valuation.service';

@ApiTags('Inventory Valuation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory-valuation')
export class InventoryValuationController {
  constructor(private readonly inventoryValuationService: InventoryValuationService) {}

  @Get()
  @ApiOperation({ summary: 'Get current or historical inventory valuation by item and warehouse' })
  @ApiOkResponse({ type: InventoryValuationPageResponseDto })
  getValuation(
    @Req() request: InventoryValuationAuthenticatedRequest,
    @Query() query: InventoryValuationQueryDto,
  ): Promise<InventoryValuationPageResponseDto> {
    return this.inventoryValuationService.getValuation(request.user.companyId, query);
  }
}
