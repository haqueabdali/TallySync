import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class TrialBalanceFilterDto {
  @ApiPropertyOptional({ example: '2026-01-01' }) @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional({ example: 'EUR' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
}
