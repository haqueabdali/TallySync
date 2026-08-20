import { LicensePlan } from '../enums/license-plan.enum';
import { LicenseStatus } from '../enums/license-status.enum';
import { LicensedFeature } from '../enums/licensed-feature.enum';

export interface LicenseFeatureEntitlement {
  feature: LicensedFeature;
  enabled: boolean;
  featureLimit: number | null;
  config: Record<string, unknown> | null;
}

export interface LicenseEntitlement {
  licenseId: string;
  licenseNumber: string;
  companyId: string;
  plan: LicensePlan;
  status: LicenseStatus;
  maxUsers: number;
  maxConcurrentUsers: number | null;
  validFrom: Date | null;
  expiresAt: Date | null;
  minimumVersion: string | null;
  maximumVersion: string | null;
  features: LicenseFeatureEntitlement[];
}
