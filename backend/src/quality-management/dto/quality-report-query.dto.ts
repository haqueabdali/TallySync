import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class QualityReportQueryDto {
  @ApiProperty()
  @IsDateString()
  dateFrom!: string;

  @ApiProperty()
  @IsDateString()
  dateTo!: string;
}
