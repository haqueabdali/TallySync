import { ApiProperty } from '@nestjs/swagger';

import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PostingLineResponseDto } from './posting-line-response.dto';

export class PostingPreviewResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ enum: JournalEntrySourceType })
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  entryDate!: string;

  @ApiProperty({ required: false, nullable: true })
  referenceNumber!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ required: false, nullable: true })
  narration!: string | null;

  @ApiProperty()
  totalDebit!: number;

  @ApiProperty()
  totalCredit!: number;

  @ApiProperty()
  isBalanced!: boolean;

  @ApiProperty({ type: PostingLineResponseDto, isArray: true })
  lines!: PostingLineResponseDto[];
}
