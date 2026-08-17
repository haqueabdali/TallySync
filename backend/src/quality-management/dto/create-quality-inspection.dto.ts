import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { QualityInspectionSourceType } from '../enums/quality-inspection-source-type.enum';
import { QualityCheckDto } from './quality-check.dto';

export class CreateQualityInspectionDto {
  @ApiProperty({ example: '2026-08-07' })
  @IsDateString()
  inspectionDate!: string;

  @ApiProperty({ enum: QualityInspectionSourceType })
  @IsEnum(QualityInspectionSourceType)
  sourceType!: QualityInspectionSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty({
    minimum: 0.0001,
    example: 100,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  inspectedQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inspectorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    type: QualityCheckDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QualityCheckDto)
  checks!: QualityCheckDto[];
}
