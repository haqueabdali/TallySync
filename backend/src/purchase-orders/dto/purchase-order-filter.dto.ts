import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';

export const PURCHASE_ORDER_SORT_FIELDS = ['poNumber','poDate','expectedDate','grandTotal','createdAt','updatedAt'] as const;
export type PurchaseOrderSortField = (typeof PURCHASE_ORDER_SORT_FIELDS)[number];

export class PurchaseOrderFilterDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional({ enum: PurchaseOrderStatus }) @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ enum: PURCHASE_ORDER_SORT_FIELDS, default: 'createdAt' }) @IsOptional() @IsIn(PURCHASE_ORDER_SORT_FIELDS) sortBy: PurchaseOrderSortField = 'createdAt';
  @ApiPropertyOptional({ enum: ['ASC','DESC'], default: 'DESC' }) @IsOptional() @IsIn(['ASC','DESC']) sortOrder: 'ASC' | 'DESC' = 'DESC';
}
