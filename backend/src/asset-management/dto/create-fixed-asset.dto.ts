import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
export class CreateFixedAssetDto {
  @ApiProperty({ maxLength: 180 }) @IsString() @Length(1, 180) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId!: string;
  @ApiProperty({ format: 'date' }) @IsDateString() acquisitionDate!: string;
  @ApiProperty({ format: 'date' }) @IsDateString() depreciationStartDate!: string;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) acquisitionCost!: number;
  @ApiPropertyOptional({ minimum: 0, default: 0 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) residualValue?: number;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) usefulLifeMonths?: number;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @Length(1, 100) serialNumber?: string;
  @ApiPropertyOptional({ maxLength: 180 }) @IsOptional() @IsString() @Length(1, 180) location?: string;
  @ApiPropertyOptional({ maxLength: 180 }) @IsOptional() @IsString() @Length(1, 180) custodian?: string;
}
