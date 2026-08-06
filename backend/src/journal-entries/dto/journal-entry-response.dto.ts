import { ApiProperty } from '@nestjs/swagger';

import { JournalEntrySourceType } from '../enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from '../enums/journal-entry-status.enum';

export class JournalEntryLineResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  debit!: number;

  @ApiProperty()
  credit!: number;

  @ApiProperty({ required: false, nullable: true })
  partyType!: string | null;

  @ApiProperty({ required: false, nullable: true })
  partyId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  costCenter!: string | null;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;
}

export class JournalEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  entryNumber!: string;

  @ApiProperty()
  entryDate!: string;

  @ApiProperty({ enum: JournalEntryStatus })
  status!: JournalEntryStatus;

  @ApiProperty({ enum: JournalEntrySourceType })
  sourceType!: JournalEntrySourceType;

  @ApiProperty({ required: false, nullable: true })
  sourceId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  referenceNumber!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  totalDebit!: number;

  @ApiProperty()
  totalCredit!: number;

  @ApiProperty({ required: false, nullable: true })
  narration!: string | null;

  @ApiProperty({
    type: JournalEntryLineResponseDto,
    isArray: true,
  })
  lines!: JournalEntryLineResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reversedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  reversedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reversalReason!: string | null;

  @ApiProperty({ required: false, nullable: true })
  reversalEntryId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  deletedAt!: Date | null;
}

export class JournalEntryPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedJournalEntriesResponseDto {
  @ApiProperty({
    type: JournalEntryResponseDto,
    isArray: true,
  })
  data!: JournalEntryResponseDto[];

  @ApiProperty({ type: JournalEntryPaginationMetaDto })
  meta!: JournalEntryPaginationMetaDto;
}
