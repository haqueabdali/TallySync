import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { SalesOrdersService } from './sales-orders.service';
import { RejectSalesOrderDto } from './dto/reject-sales-order.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';

import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { ListSalesOrdersQueryDto } from './dto/list-sales-orders-query.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
  PaginatedSalesOrdersResponseDto,
  SalesOrderResponseDto,
  SalesOrderSummaryResponseDto,
} from './dto/sales-order-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { AuditCtx } from '../users/decorators/audit-context.decorator';
import type { AuditContext } from '../users/interfaces/audit-context.interface';

import type { SalesRequestContext } from './interfaces/sales-request-context.interface';

@Controller('api/v1/sales-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Post()
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  @HttpCode(HttpStatus.CREATED)
  createSalesOrder(
    @Body() dto: CreateSalesOrderDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.createSalesOrder(
      dto,
      this.toSalesContext(audit),
    );
  }

  @Get()
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  listSalesOrders(
    @Query() query: ListSalesOrdersQueryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<PaginatedSalesOrdersResponseDto> {
    return this.salesOrdersService.listSalesOrders(
      query,
      this.toSalesContext(audit),
    );
  }
  @Get('summary')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  getSalesOrderSummary(
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderSummaryResponseDto> {
    return this.salesOrdersService.getSalesOrderSummary(
      this.toSalesContext(audit),
    );
  }
  @Get(':id')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  getSalesOrderById(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.getSalesOrderById(
      id,
      this.toSalesContext(audit),
    );
  }

  @Patch(':id')
  @Roles('admin', 'company_owner', 'sales_rep')
  updateSalesOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.updateSalesOrder(
      id,
      dto,
      this.toSalesContext(audit),
    );
  }

  @Post(':id/submit')
  @Roles('admin', 'company_owner', 'sales_rep')
  @HttpCode(HttpStatus.OK)
  submitSalesOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.submitSalesOrder(
      id,
      this.toSalesContext(audit),
    );
  }

  @Get('customers')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  listCustomers(
    @Query() query: ListCustomersQueryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<PaginatedCustomersResponseDto> {
    return this.salesOrdersService.listCustomers(
      query,
      this.toSalesContext(audit),
    );
  }

  @Get('customers/:id')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  getCustomerById(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.salesOrdersService.getCustomerById(
      id,
      this.toSalesContext(audit),
    );
  }

  @Patch('customers/:id')
  @Roles('admin', 'company_owner', 'sales_rep')
  updateCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.salesOrdersService.updateCustomer(
      id,
      dto,
      this.toSalesContext(audit),
    );
  }

  @Delete('customers/:id')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<void> {
    await this.salesOrdersService.deleteCustomer(
      id,
      this.toSalesContext(audit),
    );
  }

  @Post(':id/approve')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  approveSalesOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.approveSalesOrder(
      id,
      this.toSalesContext(audit),
    );
  }

  @Post(':id/reject')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  rejectSalesOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSalesOrderDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.rejectSalesOrder(
      id,
      dto.reason,
      this.toSalesContext(audit),
    );
  }

  @Post(':id/cancel')
  @Roles('admin', 'company_owner', 'sales_rep')
  @HttpCode(HttpStatus.OK)
  cancelSalesOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.cancelSalesOrder(
      id,
      this.toSalesContext(audit),
    );
  }

  @Post(':id/fulfil')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  fulfilSalesOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.fulfilSalesOrder(
      id,
      this.toSalesContext(audit),
    );
  }

  private toSalesContext(audit: AuditContext): SalesRequestContext {
    return {
      actorId: audit.actorId ?? null,
      companyId: audit.companyId ?? null,
      ipAddress: audit.ipAddress ?? null,
      userAgent: audit.userAgent ?? null,
    };
  }
}
