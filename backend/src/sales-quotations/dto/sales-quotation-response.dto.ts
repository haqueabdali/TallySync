import { ApiProperty } from '@nestjs/swagger';

import { SalesQuotationStatus } from '../enums/sales-quotation-status.enum';

export class SalesQuotationItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  discountPercent!: number;

  @ApiProperty()
  taxPercent!: number;

  @ApiProperty()
  lineSubtotal!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  lineTotal!: number;
}

export class SalesQuotationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  quotationNumber!: string;

  @ApiProperty()
  quotationDate!: string;

  @ApiProperty({ required: false, nullable: true })
  validUntil!: string | null;

  @ApiProperty({ enum: SalesQuotationStatus })
  status!: SalesQuotationStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discountTotal!: number;

  @ApiProperty()
  taxTotal!: number;

  @ApiProperty()
  shippingTotal!: number;

  @ApiProperty()
  grandTotal!: number;

  @ApiProperty({ required: false, nullable: true })
  customerReference!: string | null;

  @ApiProperty({ required: false, nullable: true })
  terms!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: SalesQuotationItemResponseDto, isArray: true })
  items!: SalesQuotationItemResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  deletedAt!: Date | null;
}

export class SalesQuotationPaginationMetaDto {
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

export class PaginatedSalesQuotationsResponseDto {
  @ApiProperty({ type: SalesQuotationResponseDto, isArray: true })
  data!: SalesQuotationResponseDto[];

  @ApiProperty({ type: SalesQuotationPaginationMetaDto })
  meta!: SalesQuotationPaginationMetaDto;
}
