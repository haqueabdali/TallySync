import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  itemId: string;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0.0001)
  quantity: number;

  /**
   * Optional price override.
   *
   * When omitted, the backend uses ItemEntity.salePrice.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  taxPercent?: number;
}