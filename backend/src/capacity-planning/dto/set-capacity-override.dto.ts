import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SetCapacityOverrideDto {
  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  capacityDate!: string;

  @ApiProperty({
    description: 'Available minutes for this date; use 0 for shutdown',
    example: 240,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  availableMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
