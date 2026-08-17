import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateMobileSalesOrderDto } from './dto/create-mobile-sales-order.dto';
import { MobileSalesOrderQueryDto } from './dto/mobile-sales-order-query.dto';
import { MobileService } from './mobile.service';

@Controller('mobile')
@UseGuards(JwtAuthGuard)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('dashboard')
  getDashboard() {
    return this.mobileService.getDashboard();
  }

  @Get('customers')
  getCustomers(@Query('search') search?: string) {
    return this.mobileService.getCustomers(search);
  }

  @Get('products')
  getProducts(@Query('search') search?: string) {
    return this.mobileService.getProducts(search);
  }

  @Get('sales-orders')
  getSalesOrders(@Query() query: MobileSalesOrderQueryDto) {
    return this.mobileService.getSalesOrders(query);
  }

  @Get('sales-orders/:id')
  getSalesOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.mobileService.getSalesOrder(id);
  }

  @Post('sales-orders')
  createSalesOrder(@Body() body: CreateMobileSalesOrderDto) {
    return this.mobileService.createSalesOrder(body);
  }

  @Post('sales-orders/sync-pending')
  syncPendingSalesOrders() {
    return this.mobileService.syncPendingSalesOrders();
  }

  @Post('sales-orders/:id/sync')
  syncSalesOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.mobileService.syncSalesOrder(id);
  }

  @Post('sales-orders/:id/retry')
  retrySalesOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.mobileService.retrySalesOrder(id);
  }

  @Get('tally/status')
  getTallyStatus() {
    return this.mobileService.getTallyStatus();
  }
}
