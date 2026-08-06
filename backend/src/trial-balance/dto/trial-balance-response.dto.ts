import { ApiProperty } from '@nestjs/swagger';

import { AccountType } from '../../accounts/enums/account-type.enum';

export class TrialBalanceLineDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty({ enum: AccountType }) accountType!: AccountType;
  @ApiProperty() currency!: string;
  @ApiProperty() openingDebit!: number;
  @ApiProperty() openingCredit!: number;
  @ApiProperty() periodDebit!: number;
  @ApiProperty() periodCredit!: number;
  @ApiProperty() closingDebit!: number;
  @ApiProperty() closingCredit!: number;
}

export class TrialBalanceTotalsDto {
  @ApiProperty() openingDebit!: number;
  @ApiProperty() openingCredit!: number;
  @ApiProperty() periodDebit!: number;
  @ApiProperty() periodCredit!: number;
  @ApiProperty() closingDebit!: number;
  @ApiProperty() closingCredit!: number;
}

export class TrialBalanceResponseDto {
  @ApiProperty({ nullable: true, type: String }) dateFrom!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateTo!: string | null;
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty({ type: TrialBalanceTotalsDto }) totals!: TrialBalanceTotalsDto;
  @ApiProperty() openingDifference!: number;
  @ApiProperty() periodDifference!: number;
  @ApiProperty() closingDifference!: number;
  @ApiProperty() isBalanced!: boolean;
  @ApiProperty({ type: TrialBalanceLineDto, isArray: true })
  lines!: TrialBalanceLineDto[];
}
