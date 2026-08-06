import { ApiProperty } from '@nestjs/swagger';
import { AccountNormalBalance } from '../../accounts/enums/account-normal-balance.enum';
import { AccountType } from '../../accounts/enums/account-type.enum';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';

export class GeneralLedgerLineResponseDto {
  @ApiProperty() journalEntryId!: string;
  @ApiProperty() journalEntryLineId!: string;
  @ApiProperty() entryNumber!: string;
  @ApiProperty() entryDate!: string;
  @ApiProperty({ enum: JournalEntrySourceType }) sourceType!: JournalEntrySourceType;
  @ApiProperty({ required: false, nullable: true }) sourceId!: string | null;
  @ApiProperty({ required: false, nullable: true }) referenceNumber!: string | null;
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty() debit!: number;
  @ApiProperty() credit!: number;
  @ApiProperty() runningBalance!: number;
  @ApiProperty({ required: false, nullable: true }) partyType!: string | null;
  @ApiProperty({ required: false, nullable: true }) partyId!: string | null;
  @ApiProperty({ required: false, nullable: true }) costCenter!: string | null;
  @ApiProperty({ required: false, nullable: true }) description!: string | null;
  @ApiProperty({ required: false, nullable: true }) narration!: string | null;
}

export class GeneralLedgerAccountResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty({ enum: AccountType }) accountType!: AccountType;
  @ApiProperty({ enum: AccountNormalBalance }) normalBalance!: AccountNormalBalance;
  @ApiProperty() currency!: string;
  @ApiProperty() openingBalance!: number;
  @ApiProperty() totalDebit!: number;
  @ApiProperty() totalCredit!: number;
  @ApiProperty() closingBalance!: number;
  @ApiProperty({ type: GeneralLedgerLineResponseDto, isArray: true })
  lines!: GeneralLedgerLineResponseDto[];
}

export class GeneralLedgerSummaryResponseDto {
  @ApiProperty({ required: false, nullable: true }) dateFrom!: string | null;
  @ApiProperty({ required: false, nullable: true }) dateTo!: string | null;
  @ApiProperty({ required: false, nullable: true }) currency!: string | null;
  @ApiProperty() totalDebit!: number;
  @ApiProperty() totalCredit!: number;
  @ApiProperty({ type: GeneralLedgerAccountResponseDto, isArray: true })
  accounts!: GeneralLedgerAccountResponseDto[];
}
