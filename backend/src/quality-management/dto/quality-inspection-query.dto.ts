import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { QualityInspectionSourceType } from '../enums/quality-inspection-source-type.enum';
import { QualityInspectionStatus } from '../enums/quality-inspection-status.enum';

export class QualityInspectionQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    enum: QualityInspectionStatus,
  })
  @IsOptional()
  @IsEnum(QualityInspectionStatus)
  status?: QualityInspectionStatus;

  @ApiPropertyOptional({
    enum: QualityInspectionSourceType,
  })
  @IsOptional()
  @IsEnum(QualityInspectionSourceType)
  sourceType?: QualityInspectionSourceType;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
