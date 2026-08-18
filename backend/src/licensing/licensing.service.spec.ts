import { ForbiddenException } from '@nestjs/common';

import { LicensingService } from './licensing.service';
import { LicensePlan } from './enums/license-plan.enum';
import { LicenseStatus } from './enums/license-status.enum';
import { LicensedFeature } from './enums/licensed-feature.enum';

function createService() {
  const licenseRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const featureRepository = {};
  const activationRepository = {};
  const auditRepository = {};
  const companyRepository = {};
  const userRepository = { count: jest.fn() };
  const dataSource = {};

  return {
    service: new LicensingService(
      licenseRepository as any,
      featureRepository as any,
      activationRepository as any,
      auditRepository as any,
      companyRepository as any,
      userRepository as any,
      dataSource as any,
    ),
    licenseRepository,
    userRepository,
  };
}

function activeLicense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'license-1',
    licenseNumber: 'TS-TEST-1',
    companyId: 'company-1',
    plan: LicensePlan.ENTERPRISE,
    status: LicenseStatus.ACTIVE,
    maxUsers: 5000,
    maxConcurrentUsers: 1000,
    validFrom: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 86_400_000),
    minimumVersion: '1.0.0',
    maximumVersion: '2.0.0',
    company: { isActive: true },
    features: [
      {
        feature: LicensedFeature.ACCOUNTING,
        enabled: true,
        featureLimit: null,
        config: null,
      },
      {
        feature: LicensedFeature.MANUFACTURING,
        enabled: false,
        featureLimit: null,
        config: null,
      },
    ],
    ...overrides,
  };
}

describe('LicensingService', () => {
  it('returns an active company entitlement', async () => {
    const { service, licenseRepository } = createService();
    licenseRepository.findOne.mockResolvedValue(activeLicense());

    const result = await service.getCompanyEntitlement('company-1');

    expect(result.maxUsers).toBe(5000);
    expect(result.status).toBe(LicenseStatus.ACTIVE);
    expect(result.features).toHaveLength(2);
  });

  it('rejects an expired license even when persisted status is active', async () => {
    const { service, licenseRepository } = createService();
    licenseRepository.findOne.mockResolvedValue(
      activeLicense({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(service.getCompanyEntitlement('company-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows an enabled feature and rejects a disabled feature', async () => {
    const { service, licenseRepository } = createService();
    licenseRepository.findOne.mockResolvedValue(activeLicense());

    await expect(
      service.assertFeatureEnabled('company-1', LicensedFeature.ACCOUNTING),
    ).resolves.toBeUndefined();
    await expect(
      service.assertFeatureEnabled('company-1', LicensedFeature.MANUFACTURING),
    ).rejects.toThrow(ForbiddenException);
  });

  it('enforces minimum and maximum authorized versions', async () => {
    const { service, licenseRepository } = createService();
    licenseRepository.findOne.mockResolvedValue(activeLicense());

    await expect(
      service.assertVersionAuthorized('company-1', '1.5.0'),
    ).resolves.toBeUndefined();
    await expect(
      service.assertVersionAuthorized('company-1', '0.9.9'),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.assertVersionAuthorized('company-1', '2.0.1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('enforces company user capacity', async () => {
    const { service, licenseRepository, userRepository } = createService();
    licenseRepository.findOne.mockResolvedValue(
      activeLicense({ maxUsers: 10 }),
    );
    userRepository.count.mockResolvedValue(10);

    await expect(service.assertUserCapacity('company-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
