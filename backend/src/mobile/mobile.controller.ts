import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateMobileSalesOrderDto } from './dto/create-mobile-sales-order.dto';
import { MobileSalesOrderQueryDto } from './dto/mobile-sales-order-query.dto';
import { MobileService } from './mobile.service';

type AuthenticatedMobileRequest = Request & { user: AuthenticatedUser };

@ApiTags('Mobile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.MOBILE_APP)
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('dashboard')
  getDashboard(@Req() request: AuthenticatedMobileRequest) {
    return this.mobileService.getDashboard(this.companyId(request));
  }

  @Get('customers')
  getCustomers(
    @Req() request: AuthenticatedMobileRequest,
    @Query('search') search?: string,
  ) {
    return this.mobileService.getCustomers(search, this.companyId(request));
  }

  @Get('products')
  getProducts(
    @Req() request: AuthenticatedMobileRequest,
    @Query('search') search?: string,
  ) {
    return this.mobileService.getProducts(search, this.companyId(request));
  }

  @Get('sales-orders')
  getSalesOrders(
    @Query() query: MobileSalesOrderQueryDto,
    @Req() request: AuthenticatedMobileRequest,
  ) {
    return this.mobileService.getSalesOrders(query, this.companyId(request));
  }

  @Get('sales-orders/:id')
  getSalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedMobileRequest,
  ) {
    return this.mobileService.getSalesOrder(id, this.companyId(request));
  }

  @Post('sales-orders')
  createSalesOrder(
    @Body() body: CreateMobileSalesOrderDto,
    @Req() request: AuthenticatedMobileRequest,
  ) {
    return this.mobileService.createSalesOrder(
      body,
      this.companyId(request),
      request.user.id,
    );
  }

  @Post('sales-orders/sync-pending')
  syncPendingSalesOrders(@Req() request: AuthenticatedMobileRequest) {
    return this.mobileService.syncPendingSalesOrders(this.companyId(request));
  }

  @Post('sales-orders/:id/sync')
  syncSalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedMobileRequest,
  ) {
    return this.mobileService.syncSalesOrder(id, this.companyId(request));
  }

  @Post('sales-orders/:id/retry')
  retrySalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedMobileRequest,
  ) {
    return this.mobileService.retrySalesOrder(id, this.companyId(request));
  }

  @Get('tally/status')
  getTallyStatus(@Req() request: AuthenticatedMobileRequest) {
    this.companyId(request);
    return this.mobileService.getTallyStatus();
  }

  private companyId(request: AuthenticatedMobileRequest): string {
    if (!request.user.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }
    return request.user.companyId;
  }
}
