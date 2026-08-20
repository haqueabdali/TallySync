import { LicensePlan } from './enums/license-plan.enum';
import { LicensedFeature } from './enums/licensed-feature.enum';

export interface LicensePlanTemplate {
  plan: LicensePlan;
  label: string;
  description: string;
  maxUsers: number;
  maxConcurrentUsers: number | null;
  validityDays: number;
  minimumVersion: string | null;
  maximumVersion: string | null;
  features: LicensedFeature[];
}

const CORE_FEATURES = [
  LicensedFeature.ACCOUNTING,
  LicensedFeature.INVENTORY,
  LicensedFeature.SALES,
  LicensedFeature.PURCHASE,
  LicensedFeature.REPORTING,
] as const;

export const LICENSE_PLAN_TEMPLATES: readonly LicensePlanTemplate[] = [
  {
    plan: LicensePlan.STARTER,
    label: 'Starter',
    description: 'Core ERP access for small teams with essential accounting, sales, purchasing, inventory and reporting.',
    maxUsers: 5,
    maxConcurrentUsers: 3,
    validityDays: 365,
    minimumVersion: '1.0.0',
    maximumVersion: null,
    features: [...CORE_FEATURES],
  },
  {
    plan: LicensePlan.BUSINESS,
    label: 'Business',
    description: 'Expanded commercial operations with VAT, banking, notifications and mobile access.',
    maxUsers: 25,
    maxConcurrentUsers: 10,
    validityDays: 365,
    minimumVersion: '1.0.0',
    maximumVersion: null,
    features: [
      ...CORE_FEATURES,
      LicensedFeature.VAT,
      LicensedFeature.BANK_RECONCILIATION,
      LicensedFeature.MOBILE_APP,
      LicensedFeature.NOTIFICATIONS,
    ],
  },
  {
    plan: LicensePlan.PROFESSIONAL,
    label: 'Professional',
    description: 'Broader operational control for growing businesses, including assets, costing and API access.',
    maxUsers: 100,
    maxConcurrentUsers: 40,
    validityDays: 365,
    minimumVersion: '1.0.0',
    maximumVersion: null,
    features: [
      ...CORE_FEATURES,
      LicensedFeature.COSTING,
      LicensedFeature.VAT,
      LicensedFeature.ASSET_MANAGEMENT,
      LicensedFeature.BANK_RECONCILIATION,
      LicensedFeature.MOBILE_APP,
      LicensedFeature.API_ACCESS,
      LicensedFeature.NOTIFICATIONS,
    ],
  },
  {
    plan: LicensePlan.MANUFACTURING,
    label: 'Manufacturing',
    description: 'Professional ERP plus manufacturing, WIP and costing controls for production companies.',
    maxUsers: 100,
    maxConcurrentUsers: 50,
    validityDays: 365,
    minimumVersion: '1.0.0',
    maximumVersion: null,
    features: [
      ...CORE_FEATURES,
      LicensedFeature.MANUFACTURING,
      LicensedFeature.WIP,
      LicensedFeature.COSTING,
      LicensedFeature.VAT,
      LicensedFeature.ASSET_MANAGEMENT,
      LicensedFeature.BANK_RECONCILIATION,
      LicensedFeature.MOBILE_APP,
      LicensedFeature.API_ACCESS,
      LicensedFeature.NOTIFICATIONS,
    ],
  },
  {
    plan: LicensePlan.ENTERPRISE,
    label: 'Enterprise',
    description: 'Full TallySync commercial feature set with higher user and concurrency allowances.',
    maxUsers: 500,
    maxConcurrentUsers: 200,
    validityDays: 365,
    minimumVersion: '1.0.0',
    maximumVersion: null,
    features: Object.values(LicensedFeature),
  },
  {
    plan: LicensePlan.CUSTOM,
    label: 'Custom',
    description: 'Editable baseline for negotiated contracts and customer-specific entitlement combinations.',
    maxUsers: 25,
    maxConcurrentUsers: 10,
    validityDays: 365,
    minimumVersion: '1.0.0',
    maximumVersion: null,
    features: [...CORE_FEATURES],
  },
] as const;

export function getLicensePlanTemplates(): LicensePlanTemplate[] {
  return LICENSE_PLAN_TEMPLATES.map((template) => ({
    ...template,
    features: [...template.features],
  }));
}
