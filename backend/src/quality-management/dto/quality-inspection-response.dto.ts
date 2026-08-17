import { ApiProperty } from '@nestjs/swagger';

import { QualityCheckResult } from '../enums/quality-check-result.enum';
import { QualityInspectionSourceType } from '../enums/quality-inspection-source-type.enum';
import { QualityInspectionStatus } from '../enums/quality-inspection-status.enum';

export class QualityInspectionCheckResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() checkName!: string;
  @ApiProperty({ nullable: true }) specification!: string | null;
  @ApiProperty({ nullable: true }) minimumValue!: number | null;
  @ApiProperty({ nullable: true }) maximumValue!: number | null;
  @ApiProperty({ nullable: true }) actualNumericValue!: number | null;
  @ApiProperty({ nullable: true }) expectedText!: string | null;
  @ApiProperty({ nullable: true }) actualText!: string | null;
  @ApiProperty({ enum: QualityCheckResult }) result!: QualityCheckResult;
  @ApiProperty() isMandatory!: boolean;
  @ApiProperty({ nullable: true }) remarks!: string | null;
}

export class QualityInspectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() inspectionNumber!: string;
  @ApiProperty() inspectionDate!: string;
  @ApiProperty({ enum: QualityInspectionSourceType })
  sourceType!: QualityInspectionSourceType;
  @ApiProperty({ nullable: true }) sourceId!: string | null;
  @ApiProperty({ nullable: true }) itemId!: string | null;
  @ApiProperty({ nullable: true }) warehouseId!: string | null;
  @ApiProperty({ enum: QualityInspectionStatus })
  status!: QualityInspectionStatus;
  @ApiProperty() inspectedQuantity!: number;
  @ApiProperty() acceptedQuantity!: number;
  @ApiProperty() rejectedQuantity!: number;
  @ApiProperty({ nullable: true }) inspectorId!: string | null;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;
  @ApiProperty({ nullable: true }) failureReason!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty({
    type: QualityInspectionCheckResponseDto,
    isArray: true,
  })
  checks!: QualityInspectionCheckResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class QualityInspectionMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class PaginatedQualityInspectionsResponseDto {
  @ApiProperty({
    type: QualityInspectionResponseDto,
    isArray: true,
  })
  data!: QualityInspectionResponseDto[];

  @ApiProperty({ type: QualityInspectionMetaDto })
  meta!: QualityInspectionMetaDto;
}
