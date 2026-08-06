import { ApiProperty } from '@nestjs/swagger';

export class InventoryAgingBucketResponseDto {
  @ApiProperty({ example: 12.5 })
  quantity!: number;

  @ApiProperty({ example: 1025.75 })
  value!: number;
}
