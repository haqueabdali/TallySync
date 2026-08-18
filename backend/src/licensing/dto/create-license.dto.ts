import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { LicensePlan } from '../enums/license-plan.enum';
import { LicenseFeatureInputDto } from './license-feature-input.dto';

const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/;

export class CreateLicenseDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  licenseNumber?: string;

  @IsEnum(LicensePlan)
  plan: LicensePlan;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsers: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxConcurrentUsers?: number | null;

  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @Matches(VERSION_PATTERN)
  minimumVersion?: string | null;

  @IsOptional()
  @IsString()
  @Matches(VERSION_PATTERN)
  maximumVersion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique((item: LicenseFeatureInputDto) => item.feature)
  @ValidateNested({ each: true })
  @Type(() => LicenseFeatureInputDto)
  features?: LicenseFeatureInputDto[];
}
