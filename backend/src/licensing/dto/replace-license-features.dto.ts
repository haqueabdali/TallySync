import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, ValidateNested } from 'class-validator';

import { LicenseFeatureInputDto } from './license-feature-input.dto';

export class ReplaceLicenseFeaturesDto {
  @IsArray()
  @ArrayUnique((item: LicenseFeatureInputDto) => item.feature)
  @ValidateNested({ each: true })
  @Type(() => LicenseFeatureInputDto)
  features: LicenseFeatureInputDto[];
}
