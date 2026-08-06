import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '../../accounts/enums/account-type.enum';

export class TrialBalanceLineResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty({ enum: AccountType }) accountType!: AccountType;
  @ApiProperty() openingDebit!: number;
  @ApiProperty() openingCredit!: number;
  @ApiProperty() periodDebit!: number;
  @ApiProperty() periodCredit!: number;
  @ApiProperty() closingDebit!: number;
  @ApiProperty() closingCredit!: number;
}

export class TrialBalanceResponseDto {
  @ApiProperty({ required: false, nullable: true }) dateFrom!: string | null;
  @ApiProperty({ required: false, nullable: true }) dateTo!: string | null;
  @ApiProperty({ required: false, nullable: true }) currency!: string | null;
  @ApiProperty() openingDebitTotal!: number;
  @ApiProperty() openingCreditTotal!: number;
  @ApiProperty() periodDebitTotal!: number;
  @ApiProperty() periodCreditTotal!: number;
  @ApiProperty() closingDebitTotal!: number;
  @ApiProperty() closingCreditTotal!: number;
  @ApiProperty({ type: TrialBalanceLineResponseDto, isArray: true })
  lines!: TrialBalanceLineResponseDto[];
}
