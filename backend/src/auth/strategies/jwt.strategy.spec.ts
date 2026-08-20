import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from './jwt.strategy';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
<<<<<<< HEAD
import { DEFAULT_JWT_AUDIENCE, DEFAULT_JWT_ISSUER } from '../jwt.constants';
=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
import { LicenseSessionService } from '../../licensing/license-session.service';

const mockUserRepo = () => ({
  findOne: jest.fn(),
});

const mockConfigService = () => ({
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
  get: jest.fn((key: string) => {
    if (key === 'JWT_ISSUER') return DEFAULT_JWT_ISSUER;
    if (key === 'JWT_AUDIENCE') return DEFAULT_JWT_AUDIENCE;
    return undefined;
  }),
});

const mockLicenseSessionService = () => ({
  assertAndTouchSession: jest.fn().mockResolvedValue(undefined),
});

const mockLicenseSessionService = () => ({
  assertAndTouchSession: jest.fn().mockResolvedValue(undefined),
});

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  company: null,
  roleId: 'role-uuid-1',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed',
  phone: null,
  status: UserStatus.ACTIVE,
  resetTokenHash: null,
  resetTokenExpiresAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  role: { id: 'role-uuid-1', name: 'sales_rep' } as any,
  refreshTokens: [],
  ...overrides,
});

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let licenseSessionService: ReturnType<typeof mockLicenseSessionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(UserEntity), useFactory: mockUserRepo },
        { provide: ConfigService, useFactory: mockConfigService },
        {
          provide: LicenseSessionService,
          useFactory: mockLicenseSessionService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepo = module.get(getRepositoryToken(UserEntity));
    licenseSessionService = module.get(LicenseSessionService);
  });

  afterEach(() => jest.clearAllMocks());

  const payload: JwtPayload = {
    sub: 'user-uuid-1',
    email: 'test@example.com',
    role: 'sales_rep',
    companyId: 'company-uuid-1',
  };

  it('returns an AuthenticatedUser when the user is valid and active', async () => {
    userRepo.findOne.mockResolvedValue(makeUser());

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      id: 'user-uuid-1',
      email: 'test@example.com',
      role: 'sales_rep',
      companyId: 'company-uuid-1',
      fullName: 'Test User',
    });
  });

  it('rehydrates a company-less platform owner and validates its session', async () => {
    const platformOwner = makeUser({
      companyId: null,
      role: { id: 'role-uuid-1', name: 'admin' } as any,
    });
    userRepo.findOne.mockResolvedValue(platformOwner);

    const result = await strategy.validate({
      ...payload,
      role: 'admin',
      companyId: null,
      sid: 'platform-session-1',
    });

    expect(result).toMatchObject({ role: 'admin', companyId: null });
    expect(licenseSessionService.assertAndTouchSession).toHaveBeenCalledWith(
      'platform-session-1',
      platformOwner.id,
      null,
    );
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when user status is suspended', async () => {
    userRepo.findOne.mockResolvedValue(
      makeUser({ status: UserStatus.SUSPENDED }),
    );
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when user is soft-deleted', async () => {
    userRepo.findOne.mockResolvedValue(makeUser({ deletedAt: new Date() }));
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when user status is inactive', async () => {
    userRepo.findOne.mockResolvedValue(
      makeUser({ status: UserStatus.INACTIVE }),
    );
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
