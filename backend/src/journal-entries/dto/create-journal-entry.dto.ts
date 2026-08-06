import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { JournalEntrySourceType } from '../enums/journal-entry-source-type.enum';
import { JournalEntryLineDto } from './journal-entry-line.dto';

export class CreateJournalEntryDto {
  @ApiProperty({ example: '2026-08-02' })
  @IsDateString()
  entryDate!: string;

  @ApiPropertyOptional({
    enum: JournalEntrySourceType,
    default: JournalEntrySourceType.MANUAL,
  })
  @IsOptional()
  @IsEnum(JournalEntrySourceType)
  sourceType?: JournalEntrySourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNumber?: string;

  @ApiPropertyOptional({
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  narration?: string;

  @ApiProperty({
    type: JournalEntryLineDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines!: JournalEntryLineDto[];
}
