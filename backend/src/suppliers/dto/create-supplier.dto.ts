import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'ABC Wholesale Ltd.' }) @IsString() @MaxLength(150) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(180) companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) contactPerson?: string;
  @ApiPropertyOptional({ example: 'supplier@example.com' }) @IsOptional() @IsEmail() @MaxLength(180) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) vatNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) openingBalance?: number;
  @ApiPropertyOptional({ example: 'EUR' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) paymentTerms?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
