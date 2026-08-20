import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationChannel } from '../notifications/enums/notification-channel.enum';
import { NotificationStatus } from '../notifications/enums/notification-status.enum';
import { CommercialNotificationsService } from './commercial-notifications.service';
import { LicenseEntity } from './entities/license.entity';
import { LicensePlan } from './enums/license-plan.enum';
import { LicenseStatus } from './enums/license-status.enum';

const companyId = '11111111-1111-4111-8111-111111111111';
const licenseId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';

function license(overrides: Partial<LicenseEntity> = {}): LicenseEntity {
  return {
    id: licenseId,
    companyId,
    licenseNumber: 'TS-TEST-001',
    plan: LicensePlan.BUSINESS,
    status: LicenseStatus.ACTIVE,
    maxUsers: 10,
    maxConcurrentUsers: 5,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    minimumVersion: null,
    maximumVersion: null,
    notes: null,
    certificatePayload: null,
    certificateSignature: null,
    certificatePayloadHash: null,
    certificateKeyId: null,
    certificateIssuedAt: null,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    company: undefined as never,
    features: [],
    activations: [],
    ...overrides,
  };
}

describe('CommercialNotificationsService', () => {
  let service: CommercialNotificationsService;
  const notificationRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'notification-1', ...value })),
    createQueryBuilder: jest.fn(),
  };
  const userRepository = { find: jest.fn() };
  const licenseRepository = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CommercialNotificationsService,
        { provide: getRepositoryToken(NotificationEntity), useValue: notificationRepository },
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getRepositoryToken(LicenseEntity), useValue: licenseRepository },
      ],
    }).compile();
    service = module.get(CommercialNotificationsService);
  });

  it('notifies active customer admins using the existing in-app notification table', async () => {
    userRepository.find.mockResolvedValue([
      {
        id: adminId,
        companyId,
        email: 'admin@example.com',
        status: UserStatus.ACTIVE,
        deletedAt: null,
        role: { name: 'admin' },
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        companyId,
        email: 'staff@example.com',
        status: UserStatus.ACTIVE,
        deletedAt: null,
        role: { name: 'user' },
      },
    ]);
    notificationRepository.findOne.mockResolvedValue(null);

    const created = await service.notifyCompanyAdmins(
      license(),
      'license.renewed',
      { expiresAt: '2027-09-01T00:00:00.000Z' },
      'renewal-1',
    );

    expect(created).toBe(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        recipientUserId: adminId,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        metadata: expect.objectContaining({
          category: 'commercial',
          event: 'license.renewed',
          licenseId,
        }),
      }),
    );
  });

  it('is idempotent for the same commercial notification key', async () => {
    userRepository.find.mockResolvedValue([
      {
        id: adminId,
        companyId,
        email: 'admin@example.com',
        status: UserStatus.ACTIVE,
        deletedAt: null,
        role: { name: 'admin' },
      },
    ]);
    notificationRepository.findOne.mockResolvedValue({ id: 'existing' });

    const created = await service.notifyCompanyAdmins(
      license(),
      'license.expiring',
      { daysRemaining: 7 },
      'threshold-7:2026-09-01',
    );

    expect(created).toBe(0);
    expect(notificationRepository.save).not.toHaveBeenCalled();
  });
});
