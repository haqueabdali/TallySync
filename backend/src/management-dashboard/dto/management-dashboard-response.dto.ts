import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManagementDashboardFinancialDto {
  @ApiProperty() totalIncome!: number;
  @ApiProperty() totalExpenses!: number;
  @ApiProperty() netProfit!: number;
  @ApiProperty() profitMarginPercent!: number;
  @ApiProperty() totalAssets!: number;
  @ApiProperty() totalLiabilities!: number;
  @ApiProperty() totalEquity!: number;
  @ApiProperty() balanceSheetDifference!: number;
  @ApiProperty() balanceSheetBalanced!: boolean;
}

export class ManagementDashboardWorkingCapitalDto {
  @ApiProperty() receivables!: number;
  @ApiProperty() overdueReceivables!: number;
  @ApiProperty() payables!: number;
  @ApiProperty() overduePayables!: number;
  @ApiProperty() netWorkingCapitalExposure!: number;
}

export class ManagementDashboardInventoryDto {
  @ApiProperty() distinctItems!: number;
  @ApiProperty() warehouseBalances!: number;
  @ApiProperty() totalQuantity!: number;
  @ApiProperty() totalInventoryValue!: number;
}

export class ManagementDashboardCashDto {
  @ApiProperty() openingCashBalance!: number;
  @ApiProperty() operatingCashFlow!: number;
  @ApiProperty() investingCashFlow!: number;
  @ApiProperty() financingCashFlow!: number;
  @ApiProperty() netCashMovement!: number;
  @ApiProperty() closingCashBalance!: number;
  @ApiProperty({ type: [String] }) unmappedAccountIds!: string[];
  @ApiProperty() available!: boolean;
  @ApiPropertyOptional({ nullable: true }) warning!: string | null;
}

export class ManagementDashboardAlertsDto {
  @ApiProperty() severelyOverdueReceivables!: number;
  @ApiProperty() severelyOverduePayables!: number;
  @ApiProperty() negativeCash!: boolean;
  @ApiProperty() lossMakingPeriod!: boolean;
  @ApiProperty() balanceSheetOutOfBalance!: boolean;
  @ApiProperty() cashFlowMappingsIncomplete!: boolean;
}

export class ManagementDashboardResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;
  @ApiProperty() asOfDate!: string;
  @ApiPropertyOptional({ nullable: true }) currency!: string | null;
  @ApiProperty({ type: ManagementDashboardFinancialDto })
  financial!: ManagementDashboardFinancialDto;
  @ApiProperty({ type: ManagementDashboardWorkingCapitalDto })
  workingCapital!: ManagementDashboardWorkingCapitalDto;
  @ApiProperty({ type: ManagementDashboardInventoryDto })
  inventory!: ManagementDashboardInventoryDto;
  @ApiProperty({ type: ManagementDashboardCashDto })
  cash!: ManagementDashboardCashDto;
  @ApiProperty({ type: ManagementDashboardAlertsDto })
  alerts!: ManagementDashboardAlertsDto;
}
