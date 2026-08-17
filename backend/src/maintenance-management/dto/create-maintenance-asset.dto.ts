import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MaintenanceAssetStatus } from '../enums/maintenance-asset-status.enum';

export class CreateMaintenanceAssetDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  assetCode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  assetName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: MaintenanceAssetStatus })
  @IsOptional()
  @IsEnum(MaintenanceAssetStatus)
  status?: MaintenanceAssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  commissionedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
