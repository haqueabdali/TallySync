import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateItemDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsString()
  @Length(2, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  unit?: string;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  salePrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  openingStock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  tallyItemName?: string | null;
}
