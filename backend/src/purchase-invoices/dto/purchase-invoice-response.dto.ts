import { ApiProperty } from '@nestjs/swagger';
import { PurchaseInvoiceStatus } from '../enums/purchase-invoice-status.enum';

export class PurchaseInvoiceItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty({ required: false, nullable: true }) purchaseOrderItemId!: string | null;
  @ApiProperty({ required: false, nullable: true }) goodsReceiptItemId!: string | null;
  @ApiProperty({ required: false, nullable: true }) itemName!: string | null;
  @ApiProperty({ required: false, nullable: true }) sku!: string | null;
  @ApiProperty({ required: false, nullable: true }) unit!: string | null;
  @ApiProperty({ required: false, nullable: true }) description!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitCost!: number;
  @ApiProperty() discountPercent!: number;
  @ApiProperty() taxPercent!: number;
  @ApiProperty() lineSubtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() lineTotal!: number;
}

export class PurchaseInvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty({ required: false, nullable: true }) purchaseOrderId!: string | null;
  @ApiProperty({ required: false, nullable: true }) goodsReceiptId!: string | null;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty({ required: false, nullable: true }) supplierInvoiceNumber!: string | null;
  @ApiProperty() invoiceDate!: string;
  @ApiProperty({ required: false, nullable: true }) dueDate!: string | null;
  @ApiProperty({ enum: PurchaseInvoiceStatus }) status!: PurchaseInvoiceStatus;
  @ApiProperty() currency!: string;
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountTotal!: number;
  @ApiProperty() taxTotal!: number;
  @ApiProperty() shippingTotal!: number;
  @ApiProperty() grandTotal!: number;
  @ApiProperty() paidAmount!: number;
  @ApiProperty() balanceDue!: number;
  @ApiProperty({ required: false, nullable: true }) billingAddress!: string | null;
  @ApiProperty({ required: false, nullable: true }) notes!: string | null;
  @ApiProperty({ type: PurchaseInvoiceItemResponseDto, isArray: true })
  items!: PurchaseInvoiceItemResponseDto[];
  @ApiProperty({ required: false, nullable: true }) createdBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) updatedBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) postedBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) postedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true }) cancelledBy!: string | null;
  @ApiProperty({ required: false, nullable: true }) cancelledAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ required: false, nullable: true }) deletedAt!: Date | null;
}

export class PurchaseInvoicePaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class PaginatedPurchaseInvoicesResponseDto {
  @ApiProperty({ type: PurchaseInvoiceResponseDto, isArray: true })
  data!: PurchaseInvoiceResponseDto[];

  @ApiProperty({ type: PurchaseInvoicePaginationMetaDto })
  meta!: PurchaseInvoicePaginationMetaDto;
}
