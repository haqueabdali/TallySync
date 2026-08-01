import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import {
  PaginatedSalesOrdersResponseDto,
  SalesOrderResponseDto,
} from './dto/sales-order-response.dto';
import { SalesOrderFilterDto } from './dto/sales-order-filter.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a sales order' })
  @ApiCreatedResponse({ type: SalesOrderResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSalesOrderDto,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List sales orders' })
  @ApiOkResponse({ type: PaginatedSalesOrdersResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: SalesOrderFilterDto,
  ): Promise<PaginatedSalesOrdersResponseDto> {
    return this.salesOrdersService.findAll(
      filter,
      request.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order details' })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft sales order' })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a sales order' })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  confirm(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.confirm(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales order' })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/recalculate-delivery-status')
  @ApiOperation({ summary: 'Recalculate sales order delivery status' })
  @ApiOkResponse({ type: SalesOrderResponseDto })
  recalculateDeliveryStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrdersService.recalculateDeliveryStatus(
      id,
      request.user.companyId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft sales order' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.salesOrdersService.remove(
      id,
      request.user.companyId,
    );
  }
}
