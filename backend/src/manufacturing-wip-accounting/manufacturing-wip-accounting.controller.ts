import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertWipAccountingSettingsDto } from './dto/upsert-wip-accounting-settings.dto';
import { WipPostingFilterDto } from './dto/wip-posting-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ManufacturingWipAccountingService } from './manufacturing-wip-accounting.service';

@ApiTags('Manufacturing WIP Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing-wip-accounting')
export class ManufacturingWipAccountingController {
  constructor(private readonly service: ManufacturingWipAccountingService) {}

  @Get('settings')
  @ApiOkResponse()
  getSettings(@Req() request: AuthenticatedRequest) { return this.service.getSettings(request.user.companyId); }

  @Put('settings')
  @ApiOkResponse()
  upsertSettings(@Req() request: AuthenticatedRequest, @Body() dto: UpsertWipAccountingSettingsDto) { return this.service.upsertSettings(request.user.companyId, request.user.id, dto); }

  @Post('material-consumptions/:id/post')
  @ApiOperation({ summary: 'Transfer posted material consumption cost into WIP' })
  @ApiCreatedResponse()
  postConsumption(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.postMaterialConsumption(request.user.companyId, request.user.id, id); }

  @Post('finished-goods-receipts/:id/post')
  @ApiOperation({ summary: 'Transfer posted finished-goods cost from WIP into inventory' })
  @ApiCreatedResponse()
  postReceipt(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.postFinishedGoodsReceipt(request.user.companyId, request.user.id, id); }

  @Get('postings')
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest, @Query() filter: WipPostingFilterDto) { return this.service.list(request.user.companyId, filter); }

  @Get('production-orders/:id/summary')
  @ApiOkResponse()
  summary(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.getProductionOrderSummary(request.user.companyId, id); }
}
