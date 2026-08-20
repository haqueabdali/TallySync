import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';

import { LicensedFeature } from '../enums/licensed-feature.enum';

export class LicenseFeatureInputDto {
  @IsEnum(LicensedFeature)
  feature: LicensedFeature;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  featureLimit?: number | null;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}
