import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity, UserStatus } from './entities/user.entity';

import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly bcryptRounds: number;
  private readonly resetTokenExpiryMinutes: number;
  private readonly refreshTokenExpiryDays: number;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.readPositiveInteger('BCRYPT_ROUNDS', 12);

    this.resetTokenExpiryMinutes = this.readPositiveInteger(
      'RESET_TOKEN_EXPIRES_MINUTES',
      30,
    );

    this.refreshTokenExpiryDays = this.readPositiveInteger(
      'REFRESH_TOKEN_EXPIRES_DAYS',
      30,
    );
  }

  /**
   * Authenticates a user and returns a new access/refresh token pair.
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepository.findOne({
      where: { email },
      relations: {
        role: true,
      },
    });

    /*
     * Always perform a bcrypt comparison, including when no user exists.
     * This reduces timing differences that could reveal registered emails.
     *
     * This is a valid bcrypt hash for a dummy password.
     */
    const dummyPasswordHash =
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx7B1E5K4V/aeHhNfV9R24kV8XK';

    const passwordHash = user?.passwordHash ?? dummyPasswordHash;

    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !passwordMatches) {
      this.logger.warn(
        `Rejected login attempt for ${email} from ${ipAddress ?? 'unknown IP'}`,
      );

      throw new UnauthorizedException('Invalid email or password');
    }

    this.assertUserCanAuthenticate(user);

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    this.logger.log(
      `User ${user.id} logged in from ${ipAddress ?? 'unknown IP'}`,
    );

    return this.issueTokenPair(user, ipAddress, userAgent);
  }

  /**
   * Rotates a valid refresh token and returns a new token pair.
   */
  async refreshToken(
    dto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const refreshTokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash: refreshTokenHash,
        userId: dto.userId,
      },
      relations: {
        user: {
          role: true,
        },
      },
    });

    if (!storedToken) {
      this.logger.warn(`Unknown refresh token supplied for user ${dto.userId}`);

      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked) {
      await this.revokeAllUserTokens(dto.userId);

      this.logger.warn(
        `Refresh token reuse detected for user ${dto.userId}; all sessions revoked`,
      );

      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.update(storedToken.id, {
        isRevoked: true,
      });

      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = storedToken.user;

    if (!user) {
      throw new UnauthorizedException('User account was not found');
    }

    this.assertUserCanAuthenticate(user);

    /*
     * Revoke the current token before issuing another one.
     * This implements refresh-token rotation.
     */
    await this.refreshTokenRepository.update(storedToken.id, {
      isRevoked: true,
    });

    this.logger.log(`Refresh token rotated for user ${user.id}`);

    return this.issueTokenPair(user, ipAddress, userAgent);
  }

  /**
   * Logs the current device out by revoking the supplied refresh token.
   */
  async logout(dto: LogoutDto, userId: string): Promise<MessageResponseDto> {
    const refreshTokenHash = this.hashToken(dto.refreshToken);

    await this.refreshTokenRepository.update(
      {
        tokenHash: refreshTokenHash,
        userId,
        isRevoked: false,
      },
      {
        isRevoked: true,
      },
    );

    this.logger.log(`User ${userId} logged out`);

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Generates a password-reset token.
   *
   * The same response is returned whether or not the email exists,
   * preventing account-enumeration attacks.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepository.findOne({
      where: { email },
    });

    const standardResponse: MessageResponseDto = {
      message:
        'If that email is registered, a password reset link has been sent',
    };

    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Password reset requested for unavailable account ${email}`,
      );

      return standardResponse;
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = this.hashToken(rawResetToken);

    const resetTokenExpiresAt = new Date(
      Date.now() + this.resetTokenExpiryMinutes * 60 * 1000,
    );

    await this.userRepository.update(user.id, {
      resetTokenHash,
      resetTokenExpiresAt,
    });

    /*
     * Do not log rawResetToken in production.
     *
     * Connect an EmailService here:
     *
     * await this.emailService.sendPasswordReset({
     *   email: user.email,
     *   userId: user.id,
     *   token: rawResetToken,
     * });
     */

    this.logger.log(`Password reset token generated for user ${user.id}`);

    return standardResponse;
  }

  /**
   * Replaces a password after validating a password-reset token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (user.resetTokenExpiresAt.getTime() <= Date.now()) {
      await this.clearResetToken(user.id);

      throw new BadRequestException('Password reset token has expired');
    }

    const suppliedTokenHash = this.hashToken(dto.token);

    if (!this.constantTimeHashesEqual(user.resetTokenHash, suppliedTokenHash)) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds);

    await this.userRepository.update(user.id, {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });

    await this.revokeAllUserTokens(user.id);

    this.logger.log(`Password reset completed for user ${user.id}`);

    return {
      message: 'Password reset successfully. Please log in again.',
    };
  }

  /**
   * Changes the password of an authenticated user.
   */
  async changePassword(
    dto: ChangePasswordDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordMatchesCurrent = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );

    if (newPasswordMatchesCurrent) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds);

    await this.userRepository.update(user.id, {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });

    await this.revokeAllUserTokens(user.id);

    this.logger.log(`Password changed for user ${user.id}`);

    return {
      message: 'Password changed successfully. Please log in again.',
    };
  }

  /**
   * Creates an access token and a cryptographically random refresh token.
   *
   * The raw refresh token is returned once. Only its SHA-256 hash is stored.
   */
  private async issueTokenPair(
    user: UserEntity,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!user.role) {
      throw new UnauthorizedException('No role is assigned to this account');
    }

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      companyId: user.companyId,
    };

    /*
     * JWT defaults such as secret, expiry, issuer and audience should be
     * configured in JwtModule.registerAsync() inside auth.module.ts.
     */
    const accessToken = await this.jwtService.signAsync(jwtPayload);

    const decodedToken = this.jwtService.decode(accessToken) as {
      exp?: number;
      iat?: number;
    } | null;

    if (
      !decodedToken ||
      typeof decodedToken.exp !== 'number' ||
      typeof decodedToken.iat !== 'number'
    ) {
      throw new UnauthorizedException(
        'The access token could not be generated',
      );
    }

    const accessTokenExpiresIn = decodedToken.exp - decodedToken.iat;

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');

    const refreshTokenHash = this.hashToken(rawRefreshToken);

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
    );

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
      isRevoked: false,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: accessTokenExpiresIn,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
        companyId: user.companyId,
      },
    };
  }

  /**
   * Validates status fields common to login and token refresh.
   */
  private assertUserCanAuthenticate(user: UserEntity): void {
    if (user.deletedAt) {
      throw new UnauthorizedException('Account not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account is suspended or inactive');
    }
  }

  /**
   * Stores fixed-length SHA-256 hashes for reset and refresh tokens.
   */
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  /**
   * Compares equal-length hexadecimal hashes without early-exit comparison.
   */
  private constantTimeHashesEqual(
    storedHash: string,
    suppliedHash: string,
  ): boolean {
    if (
      !/^[a-f0-9]{64}$/i.test(storedHash) ||
      !/^[a-f0-9]{64}$/i.test(suppliedHash)
    ) {
      return false;
    }

    const storedBuffer = Buffer.from(storedHash, 'hex');
    const suppliedBuffer = Buffer.from(suppliedHash, 'hex');

    return crypto.timingSafeEqual(storedBuffer, suppliedBuffer);
  }

  /**
   * Revokes all currently active refresh tokens for a user.
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      {
        userId,
        isRevoked: false,
      },
      {
        isRevoked: true,
      },
    );
  }

  /**
   * Removes expired or consumed reset-token data.
   */
  private async clearResetToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
  }

  /**
   * Reads a positive integer from environment configuration.
   */
  private readPositiveInteger(
    configurationKey: string,
    fallback: number,
  ): number {
    const rawValue = this.configService.get<string>(configurationKey);

    if (!rawValue) {
      return fallback;
    }

    const parsedValue = Number.parseInt(rawValue, 10);

    return Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }
}
