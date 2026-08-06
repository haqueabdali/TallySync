import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryCostBalanceResponseDto } from './dto/inventory-cost-balance-response.dto';
import { InventoryCostTransactionResponseDto } from './dto/inventory-cost-transaction-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { InventoryCostEngineService } from './inventory-cost-engine.service';

@ApiTags('Inventory Cost Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory-costs')
export class InventoryCostEngineController {
  constructor(private readonly service: InventoryCostEngineService) {}
  @Get(':itemId/warehouses/:warehouseId/balance')
  @ApiOperation({ summary: 'Get warehouse-level inventory cost balance' })
  @ApiOkResponse({ type: InventoryCostBalanceResponseDto })
  getBalance(@Req() request: AuthenticatedRequest, @Param('itemId', ParseUUIDPipe) itemId: string, @Param('warehouseId', ParseUUIDPipe) warehouseId: string) {
    return this.service.getBalance(request.user.companyId, itemId, warehouseId);
  }
  @Get(':itemId/warehouses/:warehouseId/transactions')
  @ApiOperation({ summary: 'Get immutable inventory cost transactions' })
  @ApiOkResponse({ type: InventoryCostTransactionResponseDto, isArray: true })
  getTransactions(@Req() request: AuthenticatedRequest, @Param('itemId', ParseUUIDPipe) itemId: string, @Param('warehouseId', ParseUUIDPipe) warehouseId: string) {
    return this.service.getTransactions(request.user.companyId, itemId, warehouseId);
  }
}
