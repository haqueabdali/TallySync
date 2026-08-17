import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class MaintenanceReportQueryDto {
  @ApiProperty()
  @IsDateString()
  dateFrom!: string;

  @ApiProperty()
  @IsDateString()
  dateTo!: string;
}
