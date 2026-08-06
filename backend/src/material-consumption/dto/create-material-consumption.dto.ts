import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateMaterialConsumptionLineDto } from './create-material-consumption-line.dto';

export class CreateMaterialConsumptionDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  consumptionNumber!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productionOrderId!: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsDateString()
  consumptionDate!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [CreateMaterialConsumptionLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialConsumptionLineDto)
  lines!: CreateMaterialConsumptionLineDto[];
}
