import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RescheduleProductionDto {
  @ApiProperty()
  @IsDateString()
  plannedStartAt!: string;

  @ApiProperty()
  @IsDateString()
  plannedEndAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
