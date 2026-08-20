import * as bcrypt from 'bcrypt';

import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { LicenseSessionEntity } from '../licensing/entities/license-session.entity';
import {
  bootstrapPlatformOwner,
  type PlatformOwnerBootstrapConfig,
  readPlatformOwnerBootstrapConfig,
} from './platform-owner-bootstrap';

const config: PlatformOwnerBootstrapConfig = {
  email: 'owner@tallysync.test',
  password: 'PlatformPass1!',
  fullName: 'TallySync Platform Owner',
  bcryptRounds: 4,
};

const makePlatformOwner = (overrides: Partial<UserEntity> = {}) =>
  ({
    id: 'platform-owner-1',
    companyId: null,
    roleId: 'admin-role-1',
    fullName: config.fullName,
    email: config.email,
    passwordHash: bcrypt.hashSync(config.password, 4),
    phone: null,
    status: UserStatus.ACTIVE,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    lastLoginAt: null,
    deletedAt: null,
    ...overrides,
  }) as UserEntity;

function buildDataSource(
  options: {
    role?: RoleEntity | null;
    user?: UserEntity | null;
  } = {},
) {
  const roleRepository = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        options.role === undefined
          ? ({ id: 'admin-role-1', name: 'admin' } as RoleEntity)
          : options.role,
      ),
  };
  const userRepository = {
    findOne: jest.fn().mockResolvedValue(options.user ?? null),
    find: jest
      .fn()
      .mockResolvedValue(
        options.user &&
          options.user.companyId === null &&
          options.user.roleId === 'admin-role-1'
          ? [options.user]
          : [],
      ),
    create: jest.fn((value) => ({ id: 'platform-owner-1', ...value })),
    save: jest.fn((value) => Promise.resolve(value)),
    restore: jest.fn().mockResolvedValue(undefined),
  };
  const refreshTokenRepository = {
    update: jest.fn().mockResolvedValue(undefined),
  };
  const licenseSessionRepository = {
    update: jest.fn().mockResolvedValue(undefined),
  };
  const manager = {
    query: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn((entity) => {
      if (entity === RoleEntity) return roleRepository;
      if (entity === UserEntity) return userRepository;
      if (entity === RefreshTokenEntity) return refreshTokenRepository;
      if (entity === LicenseSessionEntity) return licenseSessionRepository;
      throw new Error('Unexpected repository');
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback) => Promise.resolve(callback(manager))),
  };

  return {
    dataSource: dataSource as any,
    roleRepository,
    userRepository,
    refreshTokenRepository,
    licenseSessionRepository,
  };
}

describe('platform owner bootstrap', () => {
  it('reads, normalizes and validates environment configuration', () => {
    expect(
      readPlatformOwnerBootstrapConfig({
        PLATFORM_ADMIN_EMAIL: ' Owner@TallySync.Test ',
        PLATFORM_ADMIN_PASSWORD: config.password,
        PLATFORM_ADMIN_NAME: ' Platform Owner ',
        BCRYPT_ROUNDS: '10',
      }),
    ).toEqual({
      email: config.email,
      password: config.password,
      fullName: 'Platform Owner',
      bcryptRounds: 10,
    });

    expect(() =>
      readPlatformOwnerBootstrapConfig({
        PLATFORM_ADMIN_EMAIL: config.email,
      }),
    ).toThrow('PLATFORM_ADMIN_PASSWORD is required');
  });

  it('creates a company-less admin with an AuthService-compatible bcrypt hash', async () => {
    const context = buildDataSource();

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).resolves.toEqual({
      action: 'created',
      userId: 'platform-owner-1',
      email: config.email,
    });

    expect(context.userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: null,
        roleId: 'admin-role-1',
        email: config.email,
        status: UserStatus.ACTIVE,
        passwordHash: expect.any(String),
      }),
    );
    const created = context.userRepository.create.mock.calls[0][0];
    await expect(
      bcrypt.compare(config.password, created.passwordHash),
    ).resolves.toBe(true);
    expect(context.refreshTokenRepository.update).not.toHaveBeenCalled();
    expect(context.licenseSessionRepository.update).not.toHaveBeenCalled();
  });

  it('is unchanged on a repeated run with the same account configuration', async () => {
    const owner = makePlatformOwner();
    const context = buildDataSource({ user: owner });

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).resolves.toMatchObject({ action: 'unchanged', userId: owner.id });

    expect(context.userRepository.create).not.toHaveBeenCalled();
    expect(context.userRepository.save).not.toHaveBeenCalled();
    expect(context.refreshTokenRepository.update).not.toHaveBeenCalled();
    expect(context.licenseSessionRepository.update).not.toHaveBeenCalled();
  });

  it('reconciles a platform owner and revokes credentials after a security change', async () => {
    const owner = makePlatformOwner({
      roleId: 'old-role',
      passwordHash: bcrypt.hashSync('PreviousPass1!', 4),
      status: UserStatus.SUSPENDED,
      resetTokenHash: 'a'.repeat(64),
      resetTokenExpiresAt: new Date(Date.now() + 60_000),
      deletedAt: new Date(),
    });
    const context = buildDataSource({ user: owner });

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).resolves.toMatchObject({ action: 'updated', userId: owner.id });

    expect(context.userRepository.restore).toHaveBeenCalledWith(owner.id);
    expect(context.userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: null,
        roleId: 'admin-role-1',
        status: UserStatus.ACTIVE,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        deletedAt: null,
      }),
    );
    expect(context.refreshTokenRepository.update).toHaveBeenCalledWith(
      { userId: owner.id, isRevoked: false },
      { isRevoked: true },
    );
    expect(context.licenseSessionRepository.update).toHaveBeenCalledWith(
      { userId: owner.id, isRevoked: false },
      { isRevoked: true, revokedAt: expect.any(Date) },
    );
  });

  it('refuses to convert the existing customer administrator', async () => {
    const context = buildDataSource({
      user: makePlatformOwner({ companyId: 'customer-company-1' }),
    });

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).rejects.toThrow('already belongs to a company user');
    expect(context.userRepository.save).not.toHaveBeenCalled();
  });

  it('reconciles an email change onto the one existing platform owner', async () => {
    const owner = makePlatformOwner({ email: 'old-owner@tallysync.test' });
    const context = buildDataSource({ user: owner });
    context.userRepository.findOne.mockResolvedValue(null);

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).resolves.toMatchObject({
      action: 'updated',
      userId: owner.id,
      email: config.email,
    });
    expect(context.userRepository.create).not.toHaveBeenCalled();
    expect(context.userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: owner.id, email: config.email }),
    );
    expect(context.refreshTokenRepository.update).toHaveBeenCalled();
    expect(context.licenseSessionRepository.update).toHaveBeenCalled();
  });

  it('stops when duplicate platform owners already exist', async () => {
    const owner = makePlatformOwner();
    const context = buildDataSource({ user: owner });
    context.userRepository.find.mockResolvedValue([
      owner,
      makePlatformOwner({
        id: 'platform-owner-2',
        email: 'second-owner@tallysync.test',
      }),
    ]);

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).rejects.toThrow('Multiple platform-owner accounts already exist');
    expect(context.userRepository.save).not.toHaveBeenCalled();
  });

  it('requires the real seeded admin role instead of inventing a role', async () => {
    const context = buildDataSource({ role: null });

    await expect(
      bootstrapPlatformOwner(context.dataSource, config),
    ).rejects.toThrow('normal database seed first');
    expect(context.userRepository.findOne).not.toHaveBeenCalled();
  });
});
