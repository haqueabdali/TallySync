import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';

export class PostSourceDocumentDto {
  @ApiProperty({ enum: JournalEntrySourceType })
  @IsEnum(JournalEntrySourceType)
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  @IsUUID()
  sourceId!: string;
}
