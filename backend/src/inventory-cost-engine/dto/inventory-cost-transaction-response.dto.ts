import { ApiProperty } from '@nestjs/swagger';
import { InventoryCostSourceType } from '../enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from '../enums/inventory-cost-transaction-type.enum';

export class InventoryCostTransactionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: InventoryCostTransactionType }) transactionType!: InventoryCostTransactionType;
  @ApiProperty({ enum: InventoryCostSourceType }) sourceType!: InventoryCostSourceType;
  @ApiProperty({ format: 'uuid' }) sourceId!: string;
  @ApiProperty({ format: 'uuid' }) sourceLineId!: string;
  @ApiProperty() transactionDate!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitCost!: number;
  @ApiProperty() totalCost!: number;
  @ApiProperty() quantityAfter!: number;
  @ApiProperty() averageUnitCostAfter!: number;
  @ApiProperty() inventoryValueAfter!: number;
  @ApiProperty() createdAt!: Date;
}
