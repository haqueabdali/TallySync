import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ItemSyncStatus } from '../enums/item-sync-status.enum';

export enum ItemSortField {
  NAME = 'name',
  SKU = 'sku',
  SELLING_PRICE = 'sellingPrice',
  PURCHASE_PRICE = 'purchasePrice',
  CURRENT_STOCK = 'currentStock',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

function optionalBoolean({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}

export class ItemFilterDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ example: 'keyboard' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  outOfStock?: boolean;

  @ApiPropertyOptional({ enum: ItemSyncStatus })
  @IsOptional()
  @IsEnum(ItemSyncStatus)
  syncStatus?: ItemSyncStatus;

  @ApiPropertyOptional({ enum: ItemSortField, default: ItemSortField.CREATED_AT })
  @IsOptional()
  @IsEnum(ItemSortField)
  sortBy: ItemSortField = ItemSortField.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
