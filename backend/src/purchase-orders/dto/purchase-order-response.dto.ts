import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';

export class PurchaseOrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty({ required: false, nullable: true }) description!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() receivedQuantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() discountPercent!: number;
  @ApiProperty() taxPercent!: number;
  @ApiProperty() lineSubtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() taxAmount!: number;
  @ApiProperty() lineTotal!: number;
}

export class PurchaseOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() poNumber!: string;
  @ApiProperty() poDate!: string;
  @ApiProperty({ required: false, nullable: true }) expectedDate!: string | null;
  @ApiProperty({ enum: PurchaseOrderStatus }) status!: PurchaseOrderStatus;
  @ApiProperty() currency!: string;
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountTotal!: number;
  @ApiProperty() taxTotal!: number;
  @ApiProperty() shippingTotal!: number;
  @ApiProperty() grandTotal!: number;
  @ApiProperty({ required: false, nullable: true }) notes!: string | null;
  @ApiProperty({ type: PurchaseOrderItemResponseDto, isArray: true }) items!: PurchaseOrderItemResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ required: false, nullable: true }) deletedAt!: Date | null;
}

export class PurchaseOrderPaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class PaginatedPurchaseOrdersResponseDto {
  @ApiProperty({ type: PurchaseOrderResponseDto, isArray: true }) data!: PurchaseOrderResponseDto[];
  @ApiProperty({ type: PurchaseOrderPaginationMetaDto }) meta!: PurchaseOrderPaginationMetaDto;
}
