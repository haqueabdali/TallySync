import { ApiProperty } from '@nestjs/swagger';

import { JournalEntryResponseDto } from '../../journal-entries/dto/journal-entry-response.dto';

export class PostingResultResponseDto {
  @ApiProperty()
  created!: boolean;

  @ApiProperty({ type: JournalEntryResponseDto })
  journalEntry!: JournalEntryResponseDto;
}
