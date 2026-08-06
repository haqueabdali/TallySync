import { ApiProperty } from '@nestjs/swagger';

import { LandedCostAllocationMethod } from '../enums/landed-cost-allocation-method.enum';
import { LandedCostStatus } from '../enums/landed-cost-status.enum';
import { LandedCostType } from '../enums/landed-cost-type.enum';

export class LandedCostChargeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LandedCostType })
  costType!: LandedCostType;

  @ApiProperty({ required: false, nullable: true })
  supplierId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  referenceNumber!: string | null;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;
}

export class LandedCostItemAllocationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  goodsReceiptItemId!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  baseValue!: number;

  @ApiProperty()
  weightValue!: number;

  @ApiProperty()
  allocationBasis!: number;

  @ApiProperty()
  allocatedCost!: number;

  @ApiProperty()
  landedUnitCost!: number;
}

export class LandedCostResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ required: false, nullable: true })
  goodsReceiptId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  purchaseInvoiceId!: string | null;

  @ApiProperty()
  landedCostNumber!: string;

  @ApiProperty()
  costDate!: string;

  @ApiProperty({ enum: LandedCostStatus })
  status!: LandedCostStatus;

  @ApiProperty({
    enum: LandedCostAllocationMethod,
  })
  allocationMethod!: LandedCostAllocationMethod;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  totalCost!: number;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({
    type: LandedCostChargeResponseDto,
    isArray: true,
  })
  charges!: LandedCostChargeResponseDto[];

  @ApiProperty({
    type: LandedCostItemAllocationResponseDto,
    isArray: true,
  })
  itemAllocations!: LandedCostItemAllocationResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  deletedAt!: Date | null;
}

export class LandedCostPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedLandedCostsResponseDto {
  @ApiProperty({
    type: LandedCostResponseDto,
    isArray: true,
  })
  data!: LandedCostResponseDto[];

  @ApiProperty({
    type: LandedCostPaginationMetaDto,
  })
  meta!: LandedCostPaginationMetaDto;
}
