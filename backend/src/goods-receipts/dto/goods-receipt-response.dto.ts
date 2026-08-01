import { ApiProperty } from '@nestjs/swagger';
import { GoodsReceiptStatus } from '../enums/goods-receipt-status.enum';

export class GoodsReceiptItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  purchaseOrderItemId: string;

  @ApiProperty()
  itemId: string;

  @ApiProperty()
  orderedQty: number;

  @ApiProperty()
  receivedQty: number;

  @ApiProperty()
  acceptedQty: number;

  @ApiProperty()
  rejectedQty: number;

  @ApiProperty()
  unitCost: number;

  @ApiProperty({
  required: false,
  nullable: true,
})
remarks?: string | null;
}

export class GoodsReceiptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  purchaseOrderId: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  grnNumber: string;

  @ApiProperty()
  grnDate: Date;

  @ApiProperty({
    enum: GoodsReceiptStatus,
  })
  status: GoodsReceiptStatus;

  @ApiProperty({
  required: false,
  nullable: true,
})
remarks?: string | null;

  @ApiProperty({
    type: [GoodsReceiptItemResponseDto],
  })
  items: GoodsReceiptItemResponseDto[];

  @ApiProperty({
  required: false,
  nullable: true,
})
createdBy!: string | null;

@ApiProperty({
  required: false,
  nullable: true,
})
updatedBy!: string | null;  

@ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedGoodsReceiptsResponseDto {
  @ApiProperty({
    type: [GoodsReceiptResponseDto],
  })
  data: GoodsReceiptResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}