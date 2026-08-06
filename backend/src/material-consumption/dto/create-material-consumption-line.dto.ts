import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateMaterialConsumptionLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productionOrderComponentId!: string;

  @ApiProperty({ example: 5.25, minimum: 0.000001 })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
