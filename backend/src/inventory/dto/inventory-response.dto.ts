import { InventorySyncStatus } from '../entities/item.entity';
import { StockAdjustmentType } from './adjust-stock.dto';

export class CategoryResponseDto {
  id: string;

  companyId: string;

  name: string;

  tallyGroup: string | null;

  createdAt: Date;

  updatedAt: Date;
}

export class PaginatedCategoriesResponseDto {
  data: CategoryResponseDto[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export class ItemCategorySummaryDto {
  id: string;

  name: string;

  tallyGroup: string | null;
}

export class ItemResponseDto {
  id: string;

  companyId: string;

  categoryId: string | null;

  name: string;

  sku: string | null;

  unit: string;

  salePrice: number;

  purchasePrice: number;

  stockQty: number;

  reorderLevel: number;

  isLowStock: boolean;

  isOutOfStock: boolean;

  tallyItemName: string | null;

  syncStatus: InventorySyncStatus;

  lastSyncedAt: Date | null;

  category: ItemCategorySummaryDto | null;

  createdAt: Date;

  updatedAt: Date;
}

export class PaginatedItemsResponseDto {
  data: ItemResponseDto[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export class StockAdjustmentResponseDto {
  itemId: string;

  sku: string | null;

  adjustmentType: StockAdjustmentType;

  previousStock: number;

  adjustmentQuantity: number;

  currentStock: number;

  reason: string | null;

  adjustedAt: Date;
}

export class InventorySummaryResponseDto {
  totalItems: number;

  totalStockQuantity: number;

  lowStockItems: number;

  outOfStockItems: number;

  pendingSyncItems: number;

  syncedItems: number;

  failedSyncItems: number;

  lastSyncedAt: Date | null;
}