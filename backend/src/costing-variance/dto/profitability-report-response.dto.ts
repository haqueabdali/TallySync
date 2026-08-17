import { ApiProperty } from '@nestjs/swagger';

export class ProfitabilityReportResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;
  @ApiProperty() finalizedAnalyses!: number;
  @ApiProperty() totalRevenue!: number;
  @ApiProperty() totalStandardCost!: number;
  @ApiProperty() totalActualCost!: number;
  @ApiProperty() totalCostVariance!: number;
  @ApiProperty() grossProfit!: number;
  @ApiProperty() grossMarginPercent!: number;
}
