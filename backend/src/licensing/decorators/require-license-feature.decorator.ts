import { SetMetadata } from '@nestjs/common';

import { LicensedFeature } from '../enums/licensed-feature.enum';

export const REQUIRED_LICENSE_FEATURE_KEY = 'required_license_feature';

export const RequireLicenseFeature = (feature: LicensedFeature) =>
  SetMetadata(REQUIRED_LICENSE_FEATURE_KEY, feature);
