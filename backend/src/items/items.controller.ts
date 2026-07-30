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
import { CreateItemDto } from './dto/create-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new item',
  })
  @ApiCreatedResponse({
    description: 'Item created successfully',
  })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateItemDto,
  ) {
    return this.itemsService.create(
      request.user.companyId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'List items with pagination, search and filters',
  })
  @ApiOkResponse({
    description: 'Paginated item list',
  })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: ItemFilterDto,
  ) {
    return this.itemsService.findAll(
      request.user.companyId,
      filter,
    );
  }

  /*
   * Static paths must appear before @Get(':id').
   */

  @Get('low-stock')
  @ApiOperation({
    summary: 'List low-stock items',
  })
  findLowStock(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.itemsService.findLowStock(
      request.user.companyId,
    );
  }

  @Get('out-of-stock')
  @ApiOperation({
    summary: 'List out-of-stock items',
  })
  findOutOfStock(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.itemsService.findOutOfStock(
      request.user.companyId,
    );
  }

  @Get('sku/:sku')
  @ApiOperation({
    summary: 'Find an item by SKU',
  })
  findBySku(
    @Req() request: AuthenticatedRequest,
    @Param('sku') sku: string,
  ) {
    return this.itemsService.findBySku(
      request.user.companyId,
      sku,
    );
  }

  @Get('barcode/:barcode')
  @ApiOperation({
    summary: 'Find an item by barcode',
  })
  findByBarcode(
    @Req() request: AuthenticatedRequest,
    @Param('barcode') barcode: string,
  ) {
    return this.itemsService.findByBarcode(
      request.user.companyId,
      barcode,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one item',
  })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.itemsService.findOne(
      request.user.companyId,
      id,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an item',
  })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(
      request.user.companyId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate an item',
  })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.itemsService.updateStatus(
      request.user.companyId,
      id,
      dto.isActive,
    );
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore a soft-deleted item',
  })
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.itemsService.restore(
      request.user.companyId,
      id,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete an item',
  })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.itemsService.remove(
      request.user.companyId,
      id,
    );
  }
}