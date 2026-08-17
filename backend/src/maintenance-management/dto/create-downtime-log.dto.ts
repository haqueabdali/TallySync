import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDowntimeLogDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiProperty()
  @IsDateString()
  startedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
