import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength, Min, ValidateNested } from 'class-validator';
import { SupplierPaymentMethod } from '../enums/supplier-payment-method.enum';
import { SupplierPaymentAllocationDto } from './supplier-payment-allocation.dto';

export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ example: '2026-08-02' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ enum: SupplierPaymentMethod })
  @IsEnum(SupplierPaymentMethod)
  paymentMethod!: SupplierPaymentMethod;

  @ApiProperty({ minimum: 0.01, example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

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

  @ApiPropertyOptional({ example: '2026-08-05' })
  @IsOptional()
  @IsDateString()
  chequeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: SupplierPaymentAllocationDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplierPaymentAllocationDto)
  allocations?: SupplierPaymentAllocationDto[];
}
