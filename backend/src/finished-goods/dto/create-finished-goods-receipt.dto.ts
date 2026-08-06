import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFinishedGoodsReceiptDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  receiptNumber!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productionOrderId!: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsDateString()
  receiptDate!: string;

  @ApiProperty({ example: 10, minimum: 0, exclusiveMinimum: true })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
