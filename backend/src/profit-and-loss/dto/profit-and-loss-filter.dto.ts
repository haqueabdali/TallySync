import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ProfitAndLossFilterDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }): boolean => value === true || value === 'true')
  @IsBoolean()
  includeZeroBalances?: boolean;
}
