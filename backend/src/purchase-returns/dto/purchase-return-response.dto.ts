import { ApiProperty } from '@nestjs/swagger';

import { PurchaseReturnStatus } from '../enums/purchase-return-status.enum';

export class PurchaseReturnItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ required: false, nullable: true })
  purchaseInvoiceItemId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  goodsReceiptItemId!: string | null;

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

export class PurchaseReturnResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  supplierId!: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiProperty({ required: false, nullable: true })
  purchaseInvoiceId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  goodsReceiptId!: string | null;

  @ApiProperty()
  returnNumber!: string;

  @ApiProperty()
  returnDate!: string;

  @ApiProperty({ enum: PurchaseReturnStatus })
  status!: PurchaseReturnStatus;

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

  @ApiProperty({ type: PurchaseReturnItemResponseDto, isArray: true })
  items!: PurchaseReturnItemResponseDto[];

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

export class PurchaseReturnPaginationMetaDto {
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

export class PaginatedPurchaseReturnsResponseDto {
  @ApiProperty({ type: PurchaseReturnResponseDto, isArray: true })
  data!: PurchaseReturnResponseDto[];

  @ApiProperty({ type: PurchaseReturnPaginationMetaDto })
  meta!: PurchaseReturnPaginationMetaDto;
}
