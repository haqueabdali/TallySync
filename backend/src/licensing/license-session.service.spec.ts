import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { UserStatus } from '../auth/entities/user.entity';
import { LicenseSessionService } from './license-session.service';

const makeUser = () =>
  ({
    id: 'user-1',
    companyId: 'company-1',
    status: UserStatus.ACTIVE,
  }) as any;

const buildService = (
  options: {
    enforce?: boolean;
    session?: any;
    capacity?: { concurrent: number; currentActive: boolean };
  } = {},
) => {
  const save = jest.fn(async (value) => ({ id: 'session-1', ...value }));
  const update = jest.fn().mockResolvedValue(undefined);
  const manager = {
    query: jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          concurrent_users: options.capacity?.concurrent ?? 0,
          current_user_active: options.capacity?.currentActive ?? false,
        },
      ]),
    getRepository: jest.fn(() => ({
      create: jest.fn((value) => value),
      save,
    })),
    transaction: jest.fn(async (callback) => callback(manager)),
  };

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({
      activeSessions: '3',
      concurrentUsers: '2',
    }),
  };

  const sessionRepository = {
    manager,
    findOne: jest.fn().mockResolvedValue(options.session ?? null),
    update,
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  const licenseRepository = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const licensingService = {
    getCompanyEntitlement: jest.fn().mockResolvedValue({
      licenseId: 'license-1',
      maxConcurrentUsers: 1,
    }),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'LICENSE_ENFORCE_CONCURRENT_SESSIONS') {
        return options.enforce ? 'true' : 'false';
      }
      return undefined;
    }),
  };

  return {
    service: new LicenseSessionService(
      sessionRepository as any,
      licenseRepository as any,
      licensingService as any,
      configService as any,
    ),
    manager,
    sessionRepository,
    licensingService,
    save,
    update,
  };
};

describe('LicenseSessionService', () => {
  it('opens a tracked session when concurrent enforcement is disabled', async () => {
    const { service, save } = buildService();

    const result = await service.openSession({
      user: makeUser(),
      expiresAt: new Date(Date.now() + 60_000),
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.id).toBe('session-1');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        companyId: 'company-1',
        isRevoked: false,
      }),
    );
  });

  it('rejects a new concurrent user when the licensed limit is reached', async () => {
    const { service } = buildService({
      enforce: true,
      capacity: { concurrent: 1, currentActive: false },
    });

    await expect(
      service.openSession({
        user: makeUser(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows another session for a user who already occupies a concurrent seat', async () => {
    const { service } = buildService({
      enforce: true,
      capacity: { concurrent: 1, currentActive: true },
    });

    await expect(
      service.openSession({
        user: makeUser(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).resolves.toMatchObject({ id: 'session-1' });
  });

  it('rejects revoked authentication sessions', async () => {
    const { service } = buildService({
      session: {
        id: 'session-1',
        userId: 'user-1',
        companyId: 'company-1',
        isRevoked: true,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        lastSeenAt: new Date(),
      },
    });

    await expect(
      service.assertAndTouchSession('session-1', 'user-1', 'company-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('reports active sessions and distinct concurrent users separately', async () => {
    const { service } = buildService();
    await expect(service.usageForLicense('license-1')).resolves.toEqual({
      activeSessions: 3,
      concurrentUsers: 2,
    });
  });
});
