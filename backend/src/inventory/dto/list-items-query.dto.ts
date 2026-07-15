import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { InventorySyncStatus } from '../entities/item.entity';

export type ItemSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'name'
  | 'sku'
  | 'salePrice'
  | 'purchasePrice'
  | 'stockQty'
  | 'reorderLevel'
  | 'lastSyncedAt';

export type SortOrder = 'ASC' | 'DESC';

export class ListItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(InventorySyncStatus)
  syncStatus?: InventorySyncStatus;

  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'name',
    'sku',
    'salePrice',
    'purchasePrice',
    'stockQty',
    'reorderLevel',
    'lastSyncedAt',
  ])
  sortBy: ItemSortField = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: SortOrder = 'DESC';
}