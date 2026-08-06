import { ApiProperty } from '@nestjs/swagger';
import { StockLedgerEntryResponseDto } from './stock-ledger-entry-response.dto';

export class StockLedgerPageResponseDto {
  @ApiProperty({ type: StockLedgerEntryResponseDto, isArray: true })
  data!: StockLedgerEntryResponseDto[];

  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
