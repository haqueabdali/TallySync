import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProductionSchedulePriority } from '../enums/production-schedule-priority.enum';

export class CreateProductionScheduleDto {
  @ApiProperty()
  @IsUUID()
  productionOrderId!: string;

  @ApiProperty({ example: '2026-08-10T08:00:00.000Z' })
  @IsDateString()
  plannedStartAt!: string;

  @ApiProperty({ example: '2026-08-10T12:00:00.000Z' })
  @IsDateString()
  plannedEndAt!: string;

  @ApiPropertyOptional({ enum: ProductionSchedulePriority })
  @IsOptional()
  @IsEnum(ProductionSchedulePriority)
  priority?: ProductionSchedulePriority;

  @ApiPropertyOptional({ example: 'WC-ASSEMBLY-01' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workCenterCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
