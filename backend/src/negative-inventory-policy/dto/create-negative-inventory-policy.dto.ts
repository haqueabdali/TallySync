import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';
import { NegativeInventoryMode } from '../enums/negative-inventory-mode.enum';

export class CreateNegativeInventoryPolicyDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Null for a company-wide policy.' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Requires warehouseId and creates an item/warehouse override.' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty({ enum: NegativeInventoryMode })
  @IsEnum(NegativeInventoryMode)
  mode!: NegativeInventoryMode;

  @ApiPropertyOptional({ minimum: 0, description: 'Maximum absolute negative quantity. Required only for allow_with_limit.' })
  @ValidateIf((dto: CreateNegativeInventoryPolicyDto) => dto.mode === NegativeInventoryMode.ALLOW_WITH_LIMIT)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  maxNegativeQuantity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
