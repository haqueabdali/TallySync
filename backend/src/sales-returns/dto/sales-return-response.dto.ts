import { ApiProperty } from '@nestjs/swagger';

import { SalesReturnStatus } from '../enums/sales-return-status.enum';

export class SalesReturnItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salesInvoiceItemId!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ required: false, nullable: true })
  itemName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  sku!: string | null;

  @ApiProperty({ required: false, nullable: true })
  unit!: string | null;

  @ApiProperty()
  invoicedQuantity!: number;

  @ApiProperty()
  previouslyReturnedQuantity!: number;

  @ApiProperty()
  returnQuantity!: number;

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

  @ApiProperty({ required: false, nullable: true })
  reason!: string | null;
}

export class SalesReturnResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiProperty()
  salesInvoiceId!: string;

  @ApiProperty()
  returnNumber!: string;

  @ApiProperty()
  returnDate!: string;

  @ApiProperty({ enum: SalesReturnStatus })
  status!: SalesReturnStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discountTotal!: number;

  @ApiProperty()
  taxTotal!: number;

  @ApiProperty()
  grandTotal!: number;

  @ApiProperty({ required: false, nullable: true })
  reason!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: SalesReturnItemResponseDto, isArray: true })
  items!: SalesReturnItemResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reversedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  reversedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reversalReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  deletedAt!: Date | null;
}

export class SalesReturnPaginationMetaDto {
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

export class PaginatedSalesReturnsResponseDto {
  @ApiProperty({
    type: SalesReturnResponseDto,
    isArray: true,
  })
  data!: SalesReturnResponseDto[];

  @ApiProperty({ type: SalesReturnPaginationMetaDto })
  meta!: SalesReturnPaginationMetaDto;
}
