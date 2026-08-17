import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AdvancedReportQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({
    example: 'WC-ASSEMBLY-01',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workCenterCode?: string;
}
