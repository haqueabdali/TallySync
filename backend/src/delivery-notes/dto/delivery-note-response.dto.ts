import { ApiProperty } from '@nestjs/swagger';

import { DeliveryNoteStatus } from '../enums/delivery-note-status.enum';

export class DeliveryNoteItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salesOrderItemId!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ required: false, nullable: true })
  itemName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  sku!: string | null;

  @ApiProperty({ required: false, nullable: true })
  unit!: string | null;

  @ApiProperty()
  orderedQuantity!: number;

  @ApiProperty()
  previouslyDeliveredQuantity!: number;

  @ApiProperty()
  deliveredQuantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;
}

export class DeliveryNoteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiProperty()
  salesOrderId!: string;

  @ApiProperty()
  deliveryNoteNumber!: string;

  @ApiProperty()
  deliveryDate!: string;

  @ApiProperty({ enum: DeliveryNoteStatus })
  status!: DeliveryNoteStatus;

  @ApiProperty({ required: false, nullable: true })
  shippingAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  trackingNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  carrierName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  vehicleNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty({
    type: DeliveryNoteItemResponseDto,
    isArray: true,
  })
  items!: DeliveryNoteItemResponseDto[];

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

export class DeliveryNotePaginationMetaDto {
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

export class PaginatedDeliveryNotesResponseDto {
  @ApiProperty({
    type: DeliveryNoteResponseDto,
    isArray: true,
  })
  data!: DeliveryNoteResponseDto[];

  @ApiProperty({ type: DeliveryNotePaginationMetaDto })
  meta!: DeliveryNotePaginationMetaDto;
}
