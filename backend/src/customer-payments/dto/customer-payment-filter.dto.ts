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

import { CustomerPaymentMethod } from '../enums/customer-payment-method.enum';
import { CustomerPaymentStatus } from '../enums/customer-payment-status.enum';

export const CUSTOMER_PAYMENT_SORT_FIELDS = [
  'paymentNumber',
  'paymentDate',
  'amount',
  'allocatedAmount',
  'unallocatedAmount',
  'createdAt',
  'updatedAt',
] as const;

export type CustomerPaymentSortField =
  (typeof CUSTOMER_PAYMENT_SORT_FIELDS)[number];

export class CustomerPaymentFilterDto {
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

  @ApiPropertyOptional({ enum: CustomerPaymentStatus })
  @IsOptional()
  @IsEnum(CustomerPaymentStatus)
  status?: CustomerPaymentStatus;

  @ApiPropertyOptional({ enum: CustomerPaymentMethod })
  @IsOptional()
  @IsEnum(CustomerPaymentMethod)
  paymentMethod?: CustomerPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: CUSTOMER_PAYMENT_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(CUSTOMER_PAYMENT_SORT_FIELDS)
  sortBy: CustomerPaymentSortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
