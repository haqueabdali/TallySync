import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { LandedCostAllocationMethod } from '../enums/landed-cost-allocation-method.enum';
import { LandedCostStatus } from '../enums/landed-cost-status.enum';

export const LANDED_COST_SORT_FIELDS = [
  'landedCostNumber',
  'costDate',
  'totalCost',
  'createdAt',
  'updatedAt',
] as const;

export type LandedCostSortField =
  (typeof LANDED_COST_SORT_FIELDS)[number];

export class LandedCostFilterDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseInvoiceId?: string;

  @ApiPropertyOptional({ enum: LandedCostStatus })
  @IsOptional()
  @IsEnum(LandedCostStatus)
  status?: LandedCostStatus;

  @ApiPropertyOptional({
    enum: LandedCostAllocationMethod,
  })
  @IsOptional()
  @IsEnum(LandedCostAllocationMethod)
  allocationMethod?: LandedCostAllocationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: LANDED_COST_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(LANDED_COST_SORT_FIELDS)
  sortBy: LandedCostSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
