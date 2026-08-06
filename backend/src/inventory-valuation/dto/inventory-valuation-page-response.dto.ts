import { ApiProperty } from '@nestjs/swagger';
import { InventoryValuationLineResponseDto } from './inventory-valuation-line-response.dto';
import { InventoryValuationSummaryResponseDto } from './inventory-valuation-summary-response.dto';

export class InventoryValuationPageResponseDto {
  @ApiProperty({ type: [InventoryValuationLineResponseDto] })
  data!: InventoryValuationLineResponseDto[];

  @ApiProperty({ type: InventoryValuationSummaryResponseDto })
  summary!: InventoryValuationSummaryResponseDto;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
