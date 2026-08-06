import { ApiProperty } from '@nestjs/swagger';
import { InventoryAgingLineResponseDto } from './inventory-aging-line-response.dto';
import { InventoryAgingSummaryResponseDto } from './inventory-aging-summary-response.dto';

export class InventoryAgingPageResponseDto {
  @ApiProperty({ type: [InventoryAgingLineResponseDto] })
  data!: InventoryAgingLineResponseDto[];

  @ApiProperty({ type: InventoryAgingSummaryResponseDto })
  summary!: InventoryAgingSummaryResponseDto;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
