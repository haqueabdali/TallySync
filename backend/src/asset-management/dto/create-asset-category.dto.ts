import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateIf } from 'class-validator';
import { DepreciationMethod } from '../enums/depreciation-method.enum';

export class CreateAssetCategoryDto {
  @ApiProperty({ maxLength: 30 }) @IsString() @Length(1, 30) code!: string;
  @ApiProperty({ maxLength: 150 }) @IsString() @Length(1, 150) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() assetAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() accumulatedDepreciationAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() depreciationExpenseAccountId!: string;
  @ApiProperty({ enum: DepreciationMethod }) @IsEnum(DepreciationMethod) depreciationMethod!: DepreciationMethod;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) defaultUsefulLifeMonths!: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 1 }) @ValidateIf((o: CreateAssetCategoryDto) => o.depreciationMethod === DepreciationMethod.DECLINING_BALANCE) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) @Max(1) decliningBalanceRate?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
