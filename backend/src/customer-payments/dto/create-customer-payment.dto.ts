import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { CustomerPaymentMethod } from '../enums/customer-payment-method.enum';
import { CustomerPaymentAllocationDto } from './customer-payment-allocation.dto';

export class CreateCustomerPaymentDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ enum: CustomerPaymentMethod })
  @IsEnum(CustomerPaymentMethod)
  paymentMethod!: CustomerPaymentMethod;

  @ApiPropertyOptional({
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({ minimum: 0.01, example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  bankAccountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chequeNumber?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  chequeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    type: CustomerPaymentAllocationDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomerPaymentAllocationDto)
  allocations!: CustomerPaymentAllocationDto[];
}
