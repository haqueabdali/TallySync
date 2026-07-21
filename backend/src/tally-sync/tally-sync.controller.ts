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

@Controller('tally')
export class TallySyncController {
  constructor(
    private readonly tallySyncService: TallySyncService,
  ) {}

  @Get('status')
  checkConnection() {
    return this.tallySyncService.checkTallyConnection();
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
  async syncSalesOrder(
  @Param('id', new ParseUUIDPipe()) id: string,
) {
  try {
    return await this.tallySyncService.syncSalesOrder(id);
  } catch (error) {
    console.error('Tally sales-order sync failed:', error);
    throw error;
  }
}

  @Post('sync')
  getPendingOrdersForSync() {
    return this.tallySyncService.findPendingSalesOrders();
  }
}