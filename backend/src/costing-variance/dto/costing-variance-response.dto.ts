import { ApiProperty } from '@nestjs/swagger';

import { CostingAnalysisStatus } from '../enums/costing-analysis-status.enum';

export class MaterialVarianceLineResponseDto {
  @ApiProperty() itemId!: string;

  @ApiProperty() standardQuantity!: number;
  @ApiProperty() actualQuantity!: number;
  @ApiProperty() standardUnitCost!: number;
  @ApiProperty() actualUnitCost!: number;

  @ApiProperty() standardMaterialCost!: number;
  @ApiProperty() actualMaterialCost!: number;

  @ApiProperty() quantityVariance!: number;
  @ApiProperty() priceVariance!: number;
  @ApiProperty() totalMaterialVariance!: number;
}

export class CostingVarianceSummaryResponseDto {
  @ApiProperty() analysisId!: string;
  @ApiProperty() productionReferenceId!: string;
  @ApiProperty() analysisNumber!: string;
  @ApiProperty() analysisDate!: string;

  @ApiProperty({ enum: CostingAnalysisStatus })
  status!: CostingAnalysisStatus;

  @ApiProperty() plannedOutputQuantity!: number;
  @ApiProperty() actualOutputQuantity!: number;
  @ApiProperty() outputQuantityVariance!: number;

  @ApiProperty() standardMaterialCost!: number;
  @ApiProperty() actualMaterialCost!: number;
  @ApiProperty() materialQuantityVariance!: number;
  @ApiProperty() materialPriceVariance!: number;
  @ApiProperty() totalMaterialVariance!: number;

  @ApiProperty() standardConversionCost!: number;
  @ApiProperty() actualConversionCost!: number;
  @ApiProperty() conversionCostVariance!: number;

  @ApiProperty() standardOverheadCost!: number;
  @ApiProperty() actualOverheadCost!: number;
  @ApiProperty() overheadVariance!: number;

  @ApiProperty() totalStandardCost!: number;
  @ApiProperty() totalActualCost!: number;
  @ApiProperty() totalCostVariance!: number;

  @ApiProperty() standardUnitCost!: number;
  @ApiProperty() actualUnitCost!: number;

  @ApiProperty() revenueAmount!: number;
  @ApiProperty() grossProfit!: number;
  @ApiProperty() grossMarginPercent!: number;

  @ApiProperty({
    type: MaterialVarianceLineResponseDto,
    isArray: true,
  })
  materials!: MaterialVarianceLineResponseDto[];
}

export class CostingAnalysisListMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class PaginatedCostingVarianceResponseDto {
  @ApiProperty({
    type: CostingVarianceSummaryResponseDto,
    isArray: true,
  })
  data!: CostingVarianceSummaryResponseDto[];

  @ApiProperty({
    type: CostingAnalysisListMetaDto,
  })
  meta!: CostingAnalysisListMetaDto;
}
