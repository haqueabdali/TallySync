import { ApiProperty } from '@nestjs/swagger';

export class InventoryValuationSummaryResponseDto {
  @ApiProperty()
  distinctItems!: number;

  @ApiProperty()
  warehouseBalances!: number;

  @ApiProperty()
  totalQuantity!: number;

  @ApiProperty()
  totalInventoryValue!: number;
}
