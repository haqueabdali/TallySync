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

import { SalesReturnStatus } from '../enums/sales-return-status.enum';

export const SALES_RETURN_SORT_FIELDS = [
  'returnNumber',
  'returnDate',
  'grandTotal',
  'createdAt',
  'updatedAt',
] as const;

export type SalesReturnSortField =
  (typeof SALES_RETURN_SORT_FIELDS)[number];

export class SalesReturnFilterDto {
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
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  @ApiPropertyOptional({ enum: SalesReturnStatus })
  @IsOptional()
  @IsEnum(SalesReturnStatus)
  status?: SalesReturnStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: SALES_RETURN_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SALES_RETURN_SORT_FIELDS)
  sortBy: SalesReturnSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
