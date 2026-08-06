import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DepreciationRunStatus } from '../enums/depreciation-run-status.enum';
export class DepreciationRunFilterDto {
  @ApiPropertyOptional({ enum: DepreciationRunStatus }) @IsOptional() @IsEnum(DepreciationRunStatus) status?: DepreciationRunStatus;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 50, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
