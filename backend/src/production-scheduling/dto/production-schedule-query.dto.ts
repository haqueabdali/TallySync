import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ProductionSchedulePriority } from '../enums/production-schedule-priority.enum';
import { ProductionScheduleStatus } from '../enums/production-schedule-status.enum';

export class ProductionScheduleQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productionOrderId?: string;

  @ApiPropertyOptional({ enum: ProductionScheduleStatus })
  @IsOptional()
  @IsEnum(ProductionScheduleStatus)
  status?: ProductionScheduleStatus;

  @ApiPropertyOptional({ enum: ProductionSchedulePriority })
  @IsOptional()
  @IsEnum(ProductionSchedulePriority)
  priority?: ProductionSchedulePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workCenterCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
