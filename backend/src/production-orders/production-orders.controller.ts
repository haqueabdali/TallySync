import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { ProductionOrderFilterDto } from './dto/production-order-filter.dto';
import { PaginatedProductionOrdersResponseDto, ProductionOrderResponseDto } from './dto/production-order-response.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import type { AuthenticatedProductionOrderRequest } from './interfaces/authenticated-request.interface';
import { ProductionOrdersService } from './production-orders.service';

@ApiTags('Production Orders')
@ApiBearerAuth()
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(private readonly service: ProductionOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft production order from an active BOM' })
  @ApiCreatedResponse({ type: ProductionOrderResponseDto })
  create(@Body() dto: CreateProductionOrderDto, @Req() request: AuthenticatedProductionOrderRequest): Promise<ProductionOrderResponseDto> {
    return this.service.create(dto, request.user.companyId, request.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List production orders' })
  @ApiOkResponse({ type: PaginatedProductionOrdersResponseDto })
  findAll(@Query() filter: ProductionOrderFilterDto, @Req() request: AuthenticatedProductionOrderRequest): Promise<PaginatedProductionOrdersResponseDto> {
    return this.service.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a production order' })
  @ApiOkResponse({ type: ProductionOrderResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedProductionOrderRequest): Promise<ProductionOrderResponseDto> {
    return this.service.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft production order' })
  @ApiOkResponse({ type: ProductionOrderResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductionOrderDto, @Req() request: AuthenticatedProductionOrderRequest): Promise<ProductionOrderResponseDto> {
    return this.service.update(id, dto, request.user.companyId, request.user.id);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release a draft production order' })
  @ApiOkResponse({ type: ProductionOrderResponseDto })
  release(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedProductionOrderRequest): Promise<ProductionOrderResponseDto> {
    return this.service.release(id, request.user.companyId, request.user.id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a released production order' })
  @ApiOkResponse({ type: ProductionOrderResponseDto })
  start(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedProductionOrderRequest): Promise<ProductionOrderResponseDto> {
    return this.service.start(id, request.user.companyId, request.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft or released production order' })
  @ApiOkResponse({ type: ProductionOrderResponseDto })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedProductionOrderRequest): Promise<ProductionOrderResponseDto> {
    return this.service.cancel(id, request.user.companyId, request.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a draft production order' })
  @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedProductionOrderRequest): Promise<{ message: string }> {
    return this.service.remove(id, request.user.companyId);
  }
}
