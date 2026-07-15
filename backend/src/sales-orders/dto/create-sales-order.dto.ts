import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

import { OrderItemDto } from './order-item.dto';

export class CreateSalesOrderDto {
  @IsUUID()
  customerId: string;

  /**
   * ISO date format:
   * 2026-07-15
   */
  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}