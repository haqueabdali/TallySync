import { LicensePlan } from '../enums/license-plan.enum';
import { LicenseStatus } from '../enums/license-status.enum';
import { LicensedFeature } from '../enums/licensed-feature.enum';

export interface SignedLicenseFeature {
  feature: LicensedFeature;
  enabled: boolean;
  featureLimit: number | null;
  config: Record<string, unknown> | null;
}

export interface SignedLicenseCertificatePayload {
  schemaVersion: 1;
  licenseId: string;
  licenseNumber: string;
  companyId: string;
  plan: LicensePlan;
  status: LicenseStatus;
  maxUsers: number;
  maxConcurrentUsers: number | null;
  validFrom: string | null;
  expiresAt: string | null;
  minimumVersion: string | null;
  maximumVersion: string | null;
  features: SignedLicenseFeature[];
  issuedAt: string;
}

export interface SignedLicenseCertificate {
  payload: SignedLicenseCertificatePayload;
  signature: string;
  payloadHash: string;
  keyId: string;
}
