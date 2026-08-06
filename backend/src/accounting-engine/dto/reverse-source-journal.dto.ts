import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';

export class ReverseSourceJournalDto {
  @ApiProperty({ enum: JournalEntrySourceType })
  @IsEnum(JournalEntrySourceType)
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  @IsUUID()
  sourceId!: string;

  @ApiProperty({
    example: 'Source transaction was reversed.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reversalReason!: string;

  @ApiPropertyOptional({ example: '2026-08-02' })
  @IsOptional()
  @IsDateString()
  reversalDate?: string;
}
