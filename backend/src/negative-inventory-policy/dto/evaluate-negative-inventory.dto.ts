import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class EvaluateNegativeInventoryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 6 })
  currentQuantity!: number;

  @ApiProperty({ minimum: 0.000001 })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  issueQuantity!: number;
}
