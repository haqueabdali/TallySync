import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReverseJournalEntryDto {
  @ApiProperty({
    example: 'Incorrect account was selected.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reversalReason!: string;

  @ApiProperty({
    example: '2026-08-02',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  reversalDate?: string;
}
