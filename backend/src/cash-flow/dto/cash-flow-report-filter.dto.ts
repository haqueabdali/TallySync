import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CashFlowReportFilterDto {
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
}
