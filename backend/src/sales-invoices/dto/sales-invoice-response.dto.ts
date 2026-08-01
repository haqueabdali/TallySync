import { ApiProperty } from '@nestjs/swagger';

import { SalesInvoiceStatus } from '../enums/sales-invoice-status.enum';

export class SalesInvoiceItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ required: false, nullable: true })
  salesOrderItemId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  deliveryNoteItemId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  itemName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  sku!: string | null;

  @ApiProperty({ required: false, nullable: true })
  unit!: string | null;

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

export class SalesInvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ required: false, nullable: true })
  salesOrderId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  deliveryNoteId!: string | null;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty({ required: false, nullable: true })
  customerInvoiceReference!: string | null;

  @ApiProperty()
  invoiceDate!: string;

  @ApiProperty({ required: false, nullable: true })
  dueDate!: string | null;

  @ApiProperty({ enum: SalesInvoiceStatus })
  status!: SalesInvoiceStatus;

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

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  balanceDue!: number;

  @ApiProperty({ required: false, nullable: true })
  billingAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  shippingAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: SalesInvoiceItemResponseDto, isArray: true })
  items!: SalesInvoiceItemResponseDto[];

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

export class SalesInvoicePaginationMetaDto {
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

export class PaginatedSalesInvoicesResponseDto {
  @ApiProperty({
    type: SalesInvoiceResponseDto,
    isArray: true,
  })
  data!: SalesInvoiceResponseDto[];

  @ApiProperty({ type: SalesInvoicePaginationMetaDto })
  meta!: SalesInvoicePaginationMetaDto;
}
