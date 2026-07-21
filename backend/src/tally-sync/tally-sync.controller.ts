import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { PreviewSalesVoucherDto } from './dto/preview-sales-voucher.dto';
import { TallySyncService } from './tally-sync.service';
import { TallyCacheService } from './tally-cache.service';
import { TallyMasterService } from './tally-master.service';
import { TallyRetryService } from './tally-retry.service';

@Controller('tally')
export class TallySyncController {
  constructor(
    private readonly tallySyncService: TallySyncService,
    private readonly tallyCacheService: TallyCacheService,
    private readonly tallyMasterService: TallyMasterService,
    private readonly tallyRetryService: TallyRetryService,
  ) {}

  @Get('status')
  checkConnection() {
    return this.tallySyncService.checkTallyConnection();
  }

  @Get('retry-policy')
  getRetryPolicy() {
    return {
      maxAttempts: this.tallyRetryService.getMaxAttempts(),
    };
  }

  @Get('cache')
  getCacheStats() {
    return this.tallyCacheService.getStats();
  }

  @Post('cache/clear')
  clearCache() {
    this.tallyMasterService.clearCache();

    return {
      success: true,
      message: 'Tally master cache cleared',
    };
  }

  @Get('pending')
  getPendingSalesOrders() {
    return this.tallySyncService.findPendingSalesOrders();
  }

  @Post('voucher/preview')
  previewSalesVoucher(
    @Body() dto: PreviewSalesVoucherDto,
  ) {
    return this.tallySyncService.previewSalesVoucher(dto);
  }

  @Post('sales-order/:id')
  syncSalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.tallySyncService.syncSalesOrder(id);
  }

  @Post('sync')
  syncPendingSalesOrders() {
    return this.tallySyncService.syncPendingSalesOrders();
  }
}