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

import {
  SalesOrderStatus,
  SalesOrderSyncStatus,
} from '../entities/sales-order.entity';

export type SalesOrderSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'orderDate'
  | 'orderNumber'
  | 'grandTotal'
  | 'status';

export class ListSalesOrdersQueryDto {
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
  customerId?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsOptional()
  @IsEnum(SalesOrderStatus)
  status?: SalesOrderStatus;

  @IsOptional()
  @IsEnum(SalesOrderSyncStatus)
  syncStatus?: SalesOrderSyncStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'orderDate',
    'orderNumber',
    'grandTotal',
    'status',
  ])
  sortBy: SalesOrderSortField = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}