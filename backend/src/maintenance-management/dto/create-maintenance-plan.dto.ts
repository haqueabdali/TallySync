import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { MaintenancePlanFrequency } from '../enums/maintenance-plan-frequency.enum';

export class CreateMaintenancePlanDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  planName!: string;

  @ApiProperty({ enum: MaintenancePlanFrequency })
  @IsEnum(MaintenancePlanFrequency)
  frequency!: MaintenancePlanFrequency;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;
}
