import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Length, MaxLength, Min, ValidateNested } from 'class-validator';
export class CreateInventoryRevaluationLineDto {
  @ApiProperty() @IsUUID() itemId!: string;
  @ApiProperty() @IsUUID() warehouseId!: string;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 6 }) @Min(0) newUnitCost!: number;
}
export class CreateInventoryRevaluationDto {
  @ApiProperty() @IsDateString() revaluationDate!: string;
  @ApiProperty() @IsUUID() gainAccountId!: string;
  @ApiProperty() @IsUUID() lossAccountId!: string;
  @ApiPropertyOptional({ default: 'EUR' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @ApiProperty({ type: CreateInventoryRevaluationLineDto, isArray: true }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateInventoryRevaluationLineDto) lines!: CreateInventoryRevaluationLineDto[];
}
