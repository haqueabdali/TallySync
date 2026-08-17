import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Length, Min, ValidateNested } from 'class-validator';
import { ManualCostAdjustmentType } from '../enums/manual-cost-adjustment-type.enum';

export class CreateManualCostAdjustmentLineDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() itemId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() warehouseId!: string;
  @ApiProperty({ enum: ManualCostAdjustmentType }) @IsEnum(ManualCostAdjustmentType) adjustmentType!: ManualCostAdjustmentType;
  @ApiPropertyOptional({ description: 'Required for quantity adjustments.', minimum: 0.0001 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) quantity?: number;
  @ApiPropertyOptional({ description: 'Required only for quantity increases.', minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 6 }) @Min(0) unitCost?: number;
  @ApiPropertyOptional({ description: 'Required for value-only adjustments.', minimum: 0.0001 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) valueAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) reason?: string;
}

export class CreateManualCostAdjustmentDto {
  @ApiProperty({ format: 'date' }) @IsDateString() adjustmentDate!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() gainAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() lossAccountId!: string;
  @ApiPropertyOptional({ default: 'EUR' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 1000) notes?: string;
  @ApiProperty({ type: [CreateManualCostAdjustmentLineDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateManualCostAdjustmentLineDto) lines!: CreateManualCostAdjustmentLineDto[];
}
