import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGoodsReceiptItemDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderItemId: string;

  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  receivedQty: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  acceptedQty: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  rejectedQty: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsDateString()
  grnDate: string;

  @ApiPropertyOptional({
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    type: [CreateGoodsReceiptItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items: CreateGoodsReceiptItemDto[];
}