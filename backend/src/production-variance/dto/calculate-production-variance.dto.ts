import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
export class CalculateProductionVarianceDto {
  @ApiPropertyOptional({ example: '2026-08-31' }) @IsOptional() @IsDateString() varianceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
