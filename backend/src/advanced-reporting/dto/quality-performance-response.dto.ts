import { ApiProperty } from '@nestjs/swagger';

export class QualityPerformanceResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;

  @ApiProperty() totalInspections!: number;
  @ApiProperty() passed!: number;
  @ApiProperty() failed!: number;
  @ApiProperty() open!: number;
  @ApiProperty() cancelled!: number;

  @ApiProperty() inspectedQuantity!: number;
  @ApiProperty() acceptedQuantity!: number;
  @ApiProperty() rejectedQuantity!: number;

  @ApiProperty() passRatePercent!: number;
  @ApiProperty() rejectionRatePercent!: number;
}
