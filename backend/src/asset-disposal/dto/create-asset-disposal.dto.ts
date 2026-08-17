import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateAssetDisposalDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() assetId!: string;
  @ApiProperty({ example: '2026-08-31' }) @IsDateString() disposalDate!: string;
  @ApiProperty({ example: 1500 }) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) disposalProceeds!: number;
  @ApiPropertyOptional({ format: 'uuid', description: 'Required when disposalProceeds is greater than zero.' }) @IsOptional() @IsUUID() proceedsAccountId?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() gainAccountId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() lossAccountId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
