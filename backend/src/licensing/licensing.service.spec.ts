<<<<<<< HEAD
import { BadRequestException, ForbiddenException } from '@nestjs/common';
=======
import { ForbiddenException } from '@nestjs/common';
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500

import { LicensingService } from './licensing.service';
import { LicensePlan } from './enums/license-plan.enum';
import { LicenseStatus } from './enums/license-status.enum';
import { LicensedFeature } from './enums/licensed-feature.enum';

function createService() {
  const licenseRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
<<<<<<< HEAD
    save: jest.fn(async (value) => value),
  };
  const featureRepository = {};
  const activationRepository = {};
  const auditRepository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const companyRepository = {};
  const userRepository = { count: jest.fn(), find: jest.fn() };
=======
  };
  const featureRepository = {};
  const activationRepository = {};
  const auditRepository = {};
  const companyRepository = {};
  const userRepository = { count: jest.fn() };
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
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
<<<<<<< HEAD
    auditRepository,
=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
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

<<<<<<< HEAD

  it('lists platform audit history with actor and company context', async () => {
    const { service, auditRepository, userRepository } = createService();
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'audit-1',
            licenseId: 'license-1',
            actorUserId: 'actor-1',
            action: 'license.activated',
            metadata: null,
            ipAddress: null,
            createdAt: new Date('2026-08-19T12:00:00.000Z'),
            license: {
              id: 'license-1',
              licenseNumber: 'TS-TEST-1',
              companyId: 'company-1',
              company: { name: 'Demo Company' },
            },
          },
        ],
        1,
      ]),
    };
    auditRepository.createQueryBuilder.mockReturnValue(qb);
    userRepository.find.mockResolvedValue([
      { id: 'actor-1', fullName: 'Platform Owner', email: 'owner@tallysync.com' },
    ]);

    const result = await service.listAuditLogs({ page: 1, limit: 20 });

    expect(qb.orderBy).toHaveBeenCalledWith('audit.createdAt', 'DESC');
    expect(result.total).toBe(1);
    expect(result.data[0].action).toBe('license.activated');
    expect(result.data[0].license.companyName).toBe('Demo Company');
    expect(result.data[0].actor?.email).toBe('owner@tallysync.com');
  });

  it('returns upcoming expiration warnings on the platform dashboard', async () => {
    const { service, licenseRepository } = createService();
    licenseRepository.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const countQb = (value: number) => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(value),
    });
    const expiredQb = countQb(0);
    const sevenDayQb = countQb(1);
    const thirtyDayQb = countQb(2);
    const warningQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        activeLicense({
          id: 'license-warning',
          licenseNumber: 'TS-WARN-1',
          companyId: 'company-warning',
          company: { name: 'Warning Company', isActive: true },
          expiresAt: new Date(Date.now() + 5 * 86_400_000),
        }),
      ]),
    };
    licenseRepository.createQueryBuilder
      .mockReturnValueOnce(expiredQb)
      .mockReturnValueOnce(sevenDayQb)
      .mockReturnValueOnce(thirtyDayQb)
      .mockReturnValueOnce(warningQb);

    const result = await service.dashboard();

    expect(result.expiringWithin7Days).toBe(1);
    expect(result.expiringWithin30Days).toBe(2);
    expect(result.expirationWarnings).toHaveLength(1);
    expect(result.expirationWarnings[0]).toEqual(
      expect.objectContaining({
        id: 'license-warning',
        companyName: 'Warning Company',
        licenseNumber: 'TS-WARN-1',
      }),
    );
    expect(warningQb.orderBy).toHaveBeenCalledWith('license.expiresAt', 'ASC');
  });

  it('renews a license, invalidates its certificate and records audit metadata', async () => {
    const { service, licenseRepository, auditRepository } = createService();
    const currentExpiry = new Date(Date.now() + 86_400_000);
    const renewedExpiry = new Date(Date.now() + 366 * 86_400_000);
    const license = activeLicense({
      expiresAt: currentExpiry,
      certificatePayload: { licenseId: 'license-1' },
      certificateSignature: 'signature',
      certificatePayloadHash: 'hash',
      certificateKeyId: 'key-1',
      certificateIssuedAt: new Date(),
    });
    licenseRepository.findOne.mockResolvedValue(license);

    const result = await service.renew(
      'license-1',
      { expiresAt: renewedExpiry.toISOString(), renewalNote: 'Annual renewal' },
      { id: 'actor-1' } as any,
    );

    expect(licenseRepository.save).toHaveBeenCalled();
    expect(license.expiresAt).toEqual(renewedExpiry);
    expect(license.certificateSignature).toBeNull();
    expect(result).toBe(license);
    expect(auditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        licenseId: 'license-1',
        actorUserId: 'actor-1',
        action: 'license.renewed',
        metadata: expect.objectContaining({
          previousExpiresAt: currentExpiry.toISOString(),
          expiresAt: renewedExpiry.toISOString(),
          renewalNote: 'Annual renewal',
        }),
      }),
    );
  });

  it('rejects renewal that does not extend the current expiration', async () => {
    const { service, licenseRepository } = createService();
    const currentExpiry = new Date(Date.now() + 30 * 86_400_000);
    licenseRepository.findOne.mockResolvedValue(activeLicense({ expiresAt: currentExpiry }));

    await expect(
      service.renew(
        'license-1',
        { expiresAt: new Date(currentExpiry.getTime() - 1000).toISOString() },
        { id: 'actor-1' } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects renewal of a revoked license', async () => {
    const { service, licenseRepository } = createService();
    licenseRepository.findOne.mockResolvedValue(
      activeLicense({ status: LicenseStatus.REVOKED }),
    );

    await expect(
      service.renew(
        'license-1',
        { expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString() },
        { id: 'actor-1' } as any,
      ),
    ).rejects.toThrow('Revoked license cannot be renewed');
  });

=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
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
<<<<<<< HEAD

  it('returns reusable plan templates backed by existing license enums', () => {
    const { service } = createService();

    const templates = service.planTemplates();

    expect(templates.map((template) => template.plan)).toEqual([
      LicensePlan.STARTER,
      LicensePlan.BUSINESS,
      LicensePlan.PROFESSIONAL,
      LicensePlan.MANUFACTURING,
      LicensePlan.ENTERPRISE,
      LicensePlan.CUSTOM,
    ]);
    expect(
      templates.find((template) => template.plan === LicensePlan.MANUFACTURING)
        ?.features,
    ).toEqual(
      expect.arrayContaining([
        LicensedFeature.MANUFACTURING,
        LicensedFeature.WIP,
        LicensedFeature.COSTING,
      ]),
    );
    expect(
      templates.find((template) => template.plan === LicensePlan.ENTERPRISE)
        ?.features,
    ).toEqual(expect.arrayContaining(Object.values(LicensedFeature)));
  });


=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
});
