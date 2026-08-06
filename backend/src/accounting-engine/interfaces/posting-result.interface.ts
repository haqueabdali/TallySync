import { JournalEntryResponseDto } from '../../journal-entries/dto/journal-entry-response.dto';

export interface PostingResult {
  created: boolean;
  journalEntry: JournalEntryResponseDto;
}
