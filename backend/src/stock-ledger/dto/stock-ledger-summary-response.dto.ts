import { ApiProperty } from '@nestjs/swagger';

export class StockLedgerSummaryResponseDto {
  @ApiProperty() openingQuantity!: number;
  @ApiProperty() openingValue!: number;
  @ApiProperty() quantityIn!: number;
  @ApiProperty() valueIn!: number;
  @ApiProperty() quantityOut!: number;
  @ApiProperty() valueOut!: number;
  @ApiProperty() closingQuantity!: number;
  @ApiProperty() closingValue!: number;
  @ApiProperty() closingAverageUnitCost!: number;
}
