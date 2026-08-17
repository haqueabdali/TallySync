import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ManualCostAdjustmentStatus } from '../enums/manual-cost-adjustment-status.enum';
export class ManualCostAdjustmentFilterDto {
  @ApiPropertyOptional({ enum: ManualCostAdjustmentStatus }) @IsOptional() @IsEnum(ManualCostAdjustmentStatus) status?: ManualCostAdjustmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 25, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}
