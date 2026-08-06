import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
export class CreateDepreciationRunDto {
  @ApiProperty({ example: '2026-08-31' }) @IsDateString() periodEnd!: string;
  @ApiProperty({ example: '2026-08-31' }) @IsDateString() postingDate!: string;
}
