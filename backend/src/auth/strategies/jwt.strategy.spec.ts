import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from './jwt.strategy';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const mockUserRepo = () => ({
  findOne: jest.fn(),
});

const mockConfigService = () => ({
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
  get: jest.fn().mockReturnValue('tally-sync'),
});

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(UserEntity), useFactory: mockUserRepo },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepo = module.get(getRepositoryToken(UserEntity));
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
