import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { LicensePlan } from '../enums/license-plan.enum';

const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/;

export class UpdateLicenseDto {
  @IsOptional()
  @IsEnum(LicensePlan)
  plan?: LicensePlan;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsers?: number;

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
}
