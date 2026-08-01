import { ApiProperty } from '@nestjs/swagger';

import { SalesOrderStatus } from '../enums/sales-order-status.enum';

export class SalesOrderItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ required: false, nullable: true })
  salesQuotationItemId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  deliveredQuantity!: number;

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

export class SalesOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiProperty({ required: false, nullable: true })
  salesQuotationId!: string | null;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  orderDate!: string;

  @ApiProperty({ required: false, nullable: true })
  expectedDeliveryDate!: string | null;

  @ApiProperty({ enum: SalesOrderStatus })
  status!: SalesOrderStatus;

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
  shippingAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: SalesOrderItemResponseDto, isArray: true })
  items!: SalesOrderItemResponseDto[];

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

export class SalesOrderPaginationMetaDto {
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

export class PaginatedSalesOrdersResponseDto {
  @ApiProperty({ type: SalesOrderResponseDto, isArray: true })
  data!: SalesOrderResponseDto[];

  @ApiProperty({ type: SalesOrderPaginationMetaDto })
  meta!: SalesOrderPaginationMetaDto;
}
