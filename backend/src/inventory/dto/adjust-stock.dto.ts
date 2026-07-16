import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export enum StockAdjustmentType {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  SET = 'set',
}

export class AdjustStockDto {
  @IsEnum(StockAdjustmentType)
  adjustmentType: StockAdjustmentType;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  reason?: string | null;
}
