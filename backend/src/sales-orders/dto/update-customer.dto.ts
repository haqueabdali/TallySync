import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsEmail()
  @Length(3, 255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Length(7, 32)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  address?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  tallyLedgerName?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}