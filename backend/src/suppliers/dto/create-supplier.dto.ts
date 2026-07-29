import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateSupplierDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(100)
  taxNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  paymentTermsDays?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  notes?: string;
}
