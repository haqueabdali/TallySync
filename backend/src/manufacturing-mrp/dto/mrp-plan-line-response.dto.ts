import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MrpPlanLineResponseDto {
  @ApiProperty({ format: 'uuid' }) itemId!: string;
  @ApiProperty() itemName!: string;
  @ApiPropertyOptional({ nullable: true }) sku!: string | null;
  @ApiProperty() unit!: string;
  @ApiProperty({ format: 'uuid' }) warehouseId!: string;
  @ApiProperty() warehouseCode!: string;
  @ApiProperty() warehouseName!: string;
  @ApiProperty() onHandQuantity!: number;
  @ApiProperty() reorderLevel!: number;
  @ApiProperty() shortageQuantity!: number;
  @ApiProperty() recommendedReplenishmentQuantity!: number;
  @ApiProperty() averageUnitCost!: number;
  @ApiProperty() estimatedReplenishmentValue!: number;
}
