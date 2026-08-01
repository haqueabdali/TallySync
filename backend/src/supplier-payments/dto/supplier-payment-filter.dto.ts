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

import { SupplierPaymentMethod } from '../enums/supplier-payment-method.enum';
import { SupplierPaymentStatus } from '../enums/supplier-payment-status.enum';

export const SUPPLIER_PAYMENT_SORT_FIELDS = [
  'paymentNumber',
  'paymentDate',
  'amount',
  'allocatedAmount',
  'unallocatedAmount',
  'createdAt',
  'updatedAt',
] as const;

export type SupplierPaymentSortField =
  (typeof SUPPLIER_PAYMENT_SORT_FIELDS)[number];

export class SupplierPaymentFilterDto {
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
  supplierId?: string;

  @ApiPropertyOptional({ enum: SupplierPaymentStatus })
  @IsOptional()
  @IsEnum(SupplierPaymentStatus)
  status?: SupplierPaymentStatus;

  @ApiPropertyOptional({ enum: SupplierPaymentMethod })
  @IsOptional()
  @IsEnum(SupplierPaymentMethod)
  paymentMethod?: SupplierPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: SUPPLIER_PAYMENT_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SUPPLIER_PAYMENT_SORT_FIELDS)
  sortBy: SupplierPaymentSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
