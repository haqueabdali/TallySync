import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { AuthService } from './auth.service';
import { UserEntity, UserStatus } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  roleId: 'role-uuid-1',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('ValidPass1!', 12),
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

const makeRefreshToken = (
  overrides: Partial<RefreshTokenEntity> = {},
): RefreshTokenEntity => ({
  id: 'token-uuid-1',
  userId: 'user-uuid-1',
  tokenHash: crypto.createHash('sha256').update('raw-token').digest('hex'),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  isRevoked: false,
  ipAddress: null,
  userAgent: null,
  createdAt: new Date(),
  user: makeUser(),
  ...overrides,
});

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUserRepo = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
});

const mockRefreshTokenRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn((dto) => dto),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock.access.token'),
  decode: jest.fn().mockReturnValue({ iat: 0, exp: 900 }),
});

const mockConfigService = () => ({
  get: jest.fn().mockReturnValue(undefined),
  getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
});

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockUserRepo },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useFactory: mockRefreshTokenRepo,
        },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── login() ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'ValidPass1!',
    };

    it('returns an auth response on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      refreshTokenRepo.create.mockImplementation((d) => d);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login(dto, '127.0.0.1', 'jest');

      expect(result).toMatchObject({
        accessToken: 'mock.access.token',
        tokenType: 'Bearer',
        user: { email: 'test@example.com', role: 'sales_rep' },
      });
      expect(result.refreshToken).toBeDefined();
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ passwordHash: bcrypt.hashSync('DifferentPass1!', 12) }),
      );
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is suspended', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED }),
      );
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is soft-deleted', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ deletedAt: new Date() }));
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refreshToken() ─────────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    const dto: RefreshTokenDto = {
      refreshToken: 'raw-token',
      userId: 'user-uuid-1',
    };

    it('issues a new token pair on valid refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(makeRefreshToken());
      refreshTokenRepo.update.mockResolvedValue({});
      refreshTokenRepo.create.mockImplementation((d) => d);
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.refreshToken(dto);

      expect(result.accessToken).toBe('mock.access.token');
      expect(refreshTokenRepo.update).toHaveBeenCalledWith('token-uuid-1', {
        isRevoked: true,
      });
    });

    it('throws UnauthorizedException when token not found', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes all tokens and throws on reuse of revoked token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(
        makeRefreshToken({ isRevoked: true }),
      );
      refreshTokenRepo.update.mockResolvedValue({});

      await expect(service.refreshToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      // Should have called revokeAllUserTokens
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', isRevoked: false },
        { isRevoked: true },
      );
    });

    it('throws UnauthorizedException when token is expired', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(
        makeRefreshToken({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.refreshToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── logout() ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    const dto: LogoutDto = { refreshToken: 'raw-token' };

    it('revokes the token and returns success message', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(makeRefreshToken());
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.logout(dto, 'user-uuid-1');

      expect(result.message).toContain('Logged out');
      expect(refreshTokenRepo.update).toHaveBeenCalledWith('token-uuid-1', {
        isRevoked: true,
      });
    });

    it('succeeds gracefully even if the token is not found', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      const result = await service.logout(dto, 'user-uuid-1');
      expect(result.message).toBeDefined();
      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });

    it('succeeds gracefully if the token is already revoked', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(
        makeRefreshToken({ isRevoked: true }),
      );
      const result = await service.logout(dto, 'user-uuid-1');
      expect(result.message).toBeDefined();
      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── forgotPassword() ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    const dto: ForgotPasswordDto = { email: 'test@example.com' };

    it('generates a reset token and returns opaque message', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userRepo.update.mockResolvedValue({});

      const result = await service.forgotPassword(dto);

      expect(result.message).toMatch(/reset link has been sent/i);
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({
          resetTokenHash: expect.any(String),
          resetTokenExpiresAt: expect.any(Date),
        }),
      );
    });

    it('returns the same opaque message when email is not registered', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.forgotPassword(dto);
      expect(result.message).toMatch(/reset link has been sent/i);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('returns opaque message for inactive users (no token generated)', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ status: UserStatus.INACTIVE }),
      );
      const result = await service.forgotPassword(dto);
      expect(result.message).toMatch(/reset link has been sent/i);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword() ────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const rawToken = 'secure-raw-token-abc123';
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const dto: ResetPasswordDto = {
      userId: 'user-uuid-1',
      token: rawToken,
      newPassword: 'NewValidPass1!',
    };

    it('resets password and revokes all tokens on valid input', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: new Date(Date.now() + 60_000),
        }),
      );
      userRepo.update.mockResolvedValue({});
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.resetPassword(dto);

      expect(result.message).toMatch(/reset successfully/i);
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({
          passwordHash: expect.any(String),
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        }),
      );
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', isRevoked: false },
        { isRevoked: true },
      );
    });

    it('throws BadRequestException when token is invalid', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({
          resetTokenHash: 'different-hash'.padEnd(64, '0'),
          resetTokenExpiresAt: new Date(Date.now() + 60_000),
        }),
      );
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when token is expired', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: new Date(Date.now() - 1000),
        }),
      );
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when no reset token exists on user', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── changePassword() ───────────────────────────────────────────────────────

  describe('changePassword()', () => {
    const dto: ChangePasswordDto = {
      currentPassword: 'ValidPass1!',
      newPassword: 'NewValidPass1!',
    };

    it('changes password and revokes all tokens on valid input', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userRepo.update.mockResolvedValue({});
      refreshTokenRepo.update.mockResolvedValue({});

      const result = await service.changePassword(dto, 'user-uuid-1');

      expect(result.message).toMatch(/changed successfully/i);
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', isRevoked: false },
        { isRevoked: true },
      );
    });

    it('throws BadRequestException on wrong current password', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(
        service.changePassword(
          { ...dto, currentPassword: 'WrongPass1!' },
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new password equals current password', async () => {
      await expect(
        service.changePassword(
          { currentPassword: 'ValidPass1!', newPassword: 'ValidPass1!' },
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.changePassword(dto, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
