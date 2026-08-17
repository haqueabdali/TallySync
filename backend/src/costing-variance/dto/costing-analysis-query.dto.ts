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

import { CostingAnalysisStatus } from '../enums/costing-analysis-status.enum';

export class CostingAnalysisQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    enum: CostingAnalysisStatus,
  })
  @IsOptional()
  @IsEnum(CostingAnalysisStatus)
  status?: CostingAnalysisStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productionReferenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  finishedItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
