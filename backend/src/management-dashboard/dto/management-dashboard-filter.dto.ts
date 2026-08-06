import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class ManagementDashboardFilterDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
