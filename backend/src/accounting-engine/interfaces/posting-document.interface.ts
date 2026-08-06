import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PostingLine } from './posting-line.interface';

export interface PostingDocument {
  companyId: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  entryDate: string;
  referenceNumber?: string | null;
  currency: string;
  narration?: string | null;
  lines: PostingLine[];
}
