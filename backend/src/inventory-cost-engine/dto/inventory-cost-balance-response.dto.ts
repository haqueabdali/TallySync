import { ApiProperty } from '@nestjs/swagger';

export class InventoryCostBalanceResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) companyId!: string;
  @ApiProperty({ format: 'uuid' }) itemId!: string;
  @ApiProperty({ format: 'uuid' }) warehouseId!: string;
  @ApiProperty({ example: 25 }) quantity!: number;
  @ApiProperty({ example: 12.5 }) averageUnitCost!: number;
  @ApiProperty({ example: 312.5 }) inventoryValue!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
