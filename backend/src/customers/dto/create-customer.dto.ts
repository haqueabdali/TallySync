import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimNullableText = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export class CreateCustomerDto {
  @ApiProperty({ example: 'ABC Trading SRL', maxLength: 255 })
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'accounts@abctrading.it', maxLength: 255 })
  @IsOptional()
  @Transform(trimNullableText)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+39 035 1234567', maxLength: 32 })
  @IsOptional()
  @Transform(trimNullableText)
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Via Roma 10, 24121 Bergamo, Italy' })
  @IsOptional()
  @Transform(trimNullableText)
  @IsString()
  @MaxLength(2000)
  address?: string | null;

  @ApiPropertyOptional({ example: 'ABC Trading SRL', maxLength: 255 })
  @IsOptional()
  @Transform(trimNullableText)
  @IsString()
  @MaxLength(255)
  tallyLedgerName?: string | null;

  @ApiPropertyOptional({ example: 5000, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;
}
