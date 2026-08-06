import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { JournalEntrySourceType } from '../enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from '../enums/journal-entry-status.enum';

export const JOURNAL_ENTRY_SORT_FIELDS = [
  'entryNumber',
  'entryDate',
  'totalDebit',
  'totalCredit',
  'createdAt',
  'updatedAt',
] as const;

export type JournalEntrySortField =
  (typeof JOURNAL_ENTRY_SORT_FIELDS)[number];

export class JournalEntryFilterDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: JournalEntryStatus })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiPropertyOptional({ enum: JournalEntrySourceType })
  @IsOptional()
  @IsEnum(JournalEntrySourceType)
  sourceType?: JournalEntrySourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: JOURNAL_ENTRY_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(JOURNAL_ENTRY_SORT_FIELDS)
  sortBy: JournalEntrySortField = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
