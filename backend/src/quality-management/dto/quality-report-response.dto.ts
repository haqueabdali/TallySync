import { ApiProperty } from '@nestjs/swagger';

export class QualityReportResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;
  @ApiProperty() totalInspections!: number;
  @ApiProperty() passedInspections!: number;
  @ApiProperty() failedInspections!: number;
  @ApiProperty() cancelledInspections!: number;
  @ApiProperty() openInspections!: number;
  @ApiProperty() totalInspectedQuantity!: number;
  @ApiProperty() totalAcceptedQuantity!: number;
  @ApiProperty() totalRejectedQuantity!: number;
  @ApiProperty() passRatePercent!: number;
  @ApiProperty() rejectionRatePercent!: number;
}
