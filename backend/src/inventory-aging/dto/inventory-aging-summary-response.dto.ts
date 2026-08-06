import { ApiProperty } from '@nestjs/swagger';
import { InventoryAgingBucketResponseDto } from './inventory-aging-bucket-response.dto';

export class InventoryAgingSummaryResponseDto {
  @ApiProperty()
  distinctItems!: number;

  @ApiProperty()
  warehouseBalances!: number;

  @ApiProperty()
  totalQuantity!: number;

  @ApiProperty()
  totalValue!: number;

  @ApiProperty({ type: InventoryAgingBucketResponseDto })
  days0To30!: InventoryAgingBucketResponseDto;

  @ApiProperty({ type: InventoryAgingBucketResponseDto })
  days31To60!: InventoryAgingBucketResponseDto;

  @ApiProperty({ type: InventoryAgingBucketResponseDto })
  days61To90!: InventoryAgingBucketResponseDto;

  @ApiProperty({ type: InventoryAgingBucketResponseDto })
  days91To180!: InventoryAgingBucketResponseDto;

  @ApiProperty({ type: InventoryAgingBucketResponseDto })
  days181To365!: InventoryAgingBucketResponseDto;

  @ApiProperty({ type: InventoryAgingBucketResponseDto })
  daysOver365!: InventoryAgingBucketResponseDto;
}
