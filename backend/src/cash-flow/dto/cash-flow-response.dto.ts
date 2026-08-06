import { ApiProperty } from '@nestjs/swagger';

import { CashFlowActivity } from '../enums/cash-flow-activity.enum';

export class CashFlowAccountLineResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() accountCode!: string;
  @ApiProperty() accountName!: string;
  @ApiProperty({ enum: CashFlowActivity }) activity!: CashFlowActivity;
  @ApiProperty() amount!: number;
}

export class CashFlowSectionResponseDto {
  @ApiProperty({ enum: CashFlowActivity }) activity!: CashFlowActivity;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [CashFlowAccountLineResponseDto] })
  lines!: CashFlowAccountLineResponseDto[];
}

export class CashFlowReportResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;
  @ApiProperty({ nullable: true }) currency!: string | null;
  @ApiProperty() openingCashBalance!: number;
  @ApiProperty() netOperatingCashFlow!: number;
  @ApiProperty() netInvestingCashFlow!: number;
  @ApiProperty() netFinancingCashFlow!: number;
  @ApiProperty() netCashMovement!: number;
  @ApiProperty() closingCashBalance!: number;
  @ApiProperty({ type: [CashFlowSectionResponseDto] })
  sections!: CashFlowSectionResponseDto[];
  @ApiProperty({ type: [String] }) unmappedAccountIds!: string[];
}
