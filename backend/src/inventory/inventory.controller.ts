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

import { InventoryService } from './inventory.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';

import {
  CategoryResponseDto,
  InventorySummaryResponseDto,
  ItemResponseDto,
  PaginatedCategoriesResponseDto,
  PaginatedItemsResponseDto,
  StockAdjustmentResponseDto,
} from './dto/inventory-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { AuditCtx } from '../users/decorators/audit-context.decorator';
import type { AuditContext } from '../users/interfaces/audit-context.interface';

@Controller('api/v1/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  @Post('categories')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.CREATED)
  createCategory(
    @Body() dto: CreateCategoryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<CategoryResponseDto> {
    return this.inventoryService.createCategory(
      dto,
      this.toInventoryContext(audit),
    );
  }

  @Get('categories')
  @Roles(
    'admin',
    'company_owner',
    'vendor',
    'sales_rep',
  )
  listCategories(
    @Query() query: ListCategoriesQueryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<PaginatedCategoriesResponseDto> {
    return this.inventoryService.listCategories(
      query,
      this.toInventoryContext(audit),
    );
  }

  @Get('categories/:id')
  @Roles(
    'admin',
    'company_owner',
    'vendor',
    'sales_rep',
  )
  getCategoryById(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<CategoryResponseDto> {
    return this.inventoryService.getCategoryById(
      id,
      this.toInventoryContext(audit),
    );
  }

  @Patch('categories/:id')
  @Roles('admin', 'company_owner')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<CategoryResponseDto> {
    return this.inventoryService.updateCategory(
      id,
      dto,
      this.toInventoryContext(audit),
    );
  }

  @Delete('categories/:id')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<void> {
    await this.inventoryService.deleteCategory(
      id,
      this.toInventoryContext(audit),
    );
  }

  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------

  @Post('items')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.CREATED)
  createItem(
    @Body() dto: CreateItemDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<ItemResponseDto> {
    return this.inventoryService.createItem(
      dto,
      this.toInventoryContext(audit),
    );
  }

  @Get('items')
  @Roles(
    'admin',
    'company_owner',
    'vendor',
    'sales_rep',
  )
  listItems(
    @Query() query: ListItemsQueryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<PaginatedItemsResponseDto> {
    return this.inventoryService.listItems(
      query,
      this.toInventoryContext(audit),
    );
  }

  @Get('items/:id')
  @Roles(
    'admin',
    'company_owner',
    'vendor',
    'sales_rep',
  )
  getItemById(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<ItemResponseDto> {
    return this.inventoryService.getItemById(
      id,
      this.toInventoryContext(audit),
    );
  }

  @Patch('items/:id')
  @Roles('admin', 'company_owner')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<ItemResponseDto> {
    return this.inventoryService.updateItem(
      id,
      dto,
      this.toInventoryContext(audit),
    );
  }

  @Delete('items/:id')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<void> {
    await this.inventoryService.deleteItem(
      id,
      this.toInventoryContext(audit),
    );
  }

  @Post('items/:id/adjust-stock')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<StockAdjustmentResponseDto> {
    return this.inventoryService.adjustStock(
      id,
      dto,
      this.toInventoryContext(audit),
    );
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  @Get('summary')
  @Roles(
    'admin',
    'company_owner',
    'vendor',
    'sales_rep',
  )
  getSummary(
    @AuditCtx() audit: AuditContext,
  ): Promise<InventorySummaryResponseDto> {
    return this.inventoryService.getSummary(
      this.toInventoryContext(audit),
    );
  }

  private toInventoryContext(
  audit: AuditContext,
): {
  actorId: string | null;
  companyId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    actorId: audit.actorId ?? null,
    companyId: audit.companyId ?? null,
    ipAddress: audit.ipAddress ?? null,
    userAgent: audit.userAgent ?? null,
  };
}
}