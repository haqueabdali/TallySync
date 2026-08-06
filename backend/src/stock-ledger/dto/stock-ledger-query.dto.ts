import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { InventoryCostSourceType } from '../../inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from '../../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';

export class StockLedgerQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: InventoryCostSourceType })
  @IsOptional()
  @IsEnum(InventoryCostSourceType)
  sourceType?: InventoryCostSourceType;

  @ApiPropertyOptional({ enum: InventoryCostTransactionType })
  @IsOptional()
  @IsEnum(InventoryCostTransactionType)
  transactionType?: InventoryCostTransactionType;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @ApiPropertyOptional({ description: 'Set to true to sort oldest transactions first.' })
  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true')
  oldestFirst: boolean = false;
}
