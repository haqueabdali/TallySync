import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { MobileSalesOrderQueryDto } from './dto/mobile-sales-order-query.dto';
import { MobileService } from './mobile.service';

@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('dashboard')
  getDashboard() {
    return this.mobileService.getDashboard();
  }

  @Get('sales-orders')
  getSalesOrders(
    @Query() query: MobileSalesOrderQueryDto,
  ) {
    return this.mobileService.getSalesOrders(query);
  }

  @Get('sales-orders/:id')
  getSalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.mobileService.getSalesOrder(id);
  }

  @Post('sales-orders/sync-pending')
  syncPendingSalesOrders() {
    return this.mobileService.syncPendingSalesOrders();
  }

  @Post('sales-orders/:id/sync')
  syncSalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.mobileService.syncSalesOrder(id);
  }

  @Post('sales-orders/:id/retry')
  retrySalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.mobileService.retrySalesOrder(id);
  }

  @Get('tally/status')
  getTallyStatus() {
    return this.mobileService.getTallyStatus();
  }
}
