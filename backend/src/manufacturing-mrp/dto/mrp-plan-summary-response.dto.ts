import { ApiProperty } from '@nestjs/swagger';

export class MrpPlanSummaryResponseDto {
  @ApiProperty() itemWarehouseCount!: number;
  @ApiProperty() shortageCount!: number;
  @ApiProperty() totalShortageQuantity!: number;
  @ApiProperty() totalRecommendedReplenishmentQuantity!: number;
  @ApiProperty() estimatedReplenishmentValue!: number;
}
