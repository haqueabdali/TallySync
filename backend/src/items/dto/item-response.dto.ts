import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemSyncStatus } from '../enums/item-sync-status.enum';

export class ItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) companyId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) categoryId!: string | null;
  @ApiProperty({ example: 'ITEM-0001' }) sku!: string;
  @ApiPropertyOptional({ nullable: true }) barcode!: string | null;
  @ApiProperty({ example: 'Wireless Keyboard' }) name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ example: 'PCS' }) unit!: string;
  @ApiProperty({ example: 20 }) purchasePrice!: number;
  @ApiProperty({ example: 29.99 }) sellingPrice!: number;
  @ApiProperty({ example: 22 }) taxRate!: number;
  @ApiProperty({ example: 100 }) openingStock!: number;
  @ApiProperty({ example: 84 }) currentStock!: number;
  @ApiProperty({ example: 10 }) minimumStock!: number;
  @ApiProperty({ example: true }) trackInventory!: boolean;
  @ApiPropertyOptional({ nullable: true }) hsnCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) tallyStockItemId!: string | null;
  @ApiProperty({ enum: ItemSyncStatus }) syncStatus!: ItemSyncStatus;
  @ApiPropertyOptional({ nullable: true }) syncError!: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastSyncedAt!: Date | null;
  @ApiProperty({ example: true }) isActive!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  deletedAt!: Date | null;
  @ApiProperty({ example: false }) isLowStock!: boolean;
  @ApiProperty({ example: false }) isOutOfStock!: boolean;
}

export class ItemPaginationMetaDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 125 }) total!: number;
  @ApiProperty({ example: 7 }) totalPages!: number;
  @ApiProperty({ example: true }) hasNextPage!: boolean;
  @ApiProperty({ example: false }) hasPreviousPage!: boolean;
}

export class PaginatedItemsResponseDto {
  @ApiProperty({ type: [ItemResponseDto] }) data!: ItemResponseDto[];
  @ApiProperty({ type: ItemPaginationMetaDto }) meta!: ItemPaginationMetaDto;
}
