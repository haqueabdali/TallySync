import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { LandedCostAllocationMethod } from '../enums/landed-cost-allocation-method.enum';
import { LandedCostChargeDto } from './landed-cost-charge.dto';

export class CreateLandedCostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseInvoiceId?: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsDateString()
  costDate!: string;

  @ApiProperty({
    enum: LandedCostAllocationMethod,
    default: LandedCostAllocationMethod.ByValue,
  })
  @IsEnum(LandedCostAllocationMethod)
  allocationMethod!: LandedCostAllocationMethod;

  @ApiPropertyOptional({
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    type: LandedCostChargeDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LandedCostChargeDto)
  charges!: LandedCostChargeDto[];
}
