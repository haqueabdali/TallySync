import { ApiProperty } from '@nestjs/swagger';
import { InventoryCostSourceType } from '../../inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from '../../inventory-cost-engine/enums/inventory-cost-transaction-type.enum';

export class StockLedgerEntryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) itemId!: string;
  @ApiProperty({ format: 'uuid' }) warehouseId!: string;
  @ApiProperty({ type: String, format: 'date' }) transactionDate!: string;
  @ApiProperty({ enum: InventoryCostTransactionType }) transactionType!: InventoryCostTransactionType;
  @ApiProperty({ enum: InventoryCostSourceType }) sourceType!: InventoryCostSourceType;
  @ApiProperty({ format: 'uuid' }) sourceId!: string;
  @ApiProperty({ format: 'uuid' }) sourceLineId!: string;
  @ApiProperty() quantityIn!: number;
  @ApiProperty() quantityOut!: number;
  @ApiProperty() unitCost!: number;
  @ApiProperty() valueIn!: number;
  @ApiProperty() valueOut!: number;
  @ApiProperty() quantityBalance!: number;
  @ApiProperty() averageUnitCost!: number;
  @ApiProperty() inventoryValue!: number;
  @ApiProperty({ format: 'uuid', nullable: true }) createdBy!: string | null;
  @ApiProperty() createdAt!: Date;
}
