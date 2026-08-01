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

import { SalesQuotationStatus } from '../enums/sales-quotation-status.enum';

export const SALES_QUOTATION_SORT_FIELDS = [
  'quotationNumber',
  'quotationDate',
  'validUntil',
  'grandTotal',
  'createdAt',
  'updatedAt',
] as const;

export type SalesQuotationSortField =
  (typeof SALES_QUOTATION_SORT_FIELDS)[number];

export class SalesQuotationFilterDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
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
  customerId?: string;

  @ApiPropertyOptional({ enum: SalesQuotationStatus })
  @IsOptional()
  @IsEnum(SalesQuotationStatus)
  status?: SalesQuotationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: SALES_QUOTATION_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SALES_QUOTATION_SORT_FIELDS)
  sortBy: SalesQuotationSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
