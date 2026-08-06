import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVatReturnDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  notes?: string;
}
