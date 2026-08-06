import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryValuationLineResponseDto {
  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty()
  itemName!: string;

  @ApiPropertyOptional({ nullable: true })
  sku!: string | null;

  @ApiProperty()
  unit!: string;

  @ApiProperty({ format: 'uuid' })
  warehouseId!: string;

  @ApiProperty()
  warehouseCode!: string;

  @ApiProperty()
  warehouseName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  averageUnitCost!: number;

  @ApiProperty()
  inventoryValue!: number;
}
