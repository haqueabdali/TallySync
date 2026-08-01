import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { GoodsReceiptStatus } from '../enums/goods-receipt-status.enum';

export class GoodsReceiptFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: GoodsReceiptStatus,
  })
  @IsOptional()
  @IsEnum(GoodsReceiptStatus)
  status?: GoodsReceiptStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}