import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user =
      await this.usersService.findByEmailForAuthentication(dto.email);

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.markLogin(user.id);
    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (!payload.tokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        id: payload.tokenId,
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      storedToken.tokenHash !== this.hashToken(refreshToken)
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.usersService.findActiveById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    storedToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      if (payload.tokenId) {
        await this.refreshTokenRepository.update(
          {
            id: payload.tokenId,
            revokedAt: null,
          },
          {
            revokedAt: new Date(),
          },
        );
      }
    } catch {
      // Logout remains idempotent even if the supplied token is expired.
    }

    return {
      loggedOut: true,
    };
  }

  getProfile(user: UserEntity) {
    return this.usersService.toPublicUser(user);
  }

  private async issueTokenPair(user: UserEntity) {
    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';

    const tokenId = randomUUID();

    const basePayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(
      {
        ...basePayload,
        type: 'access',
      } satisfies JwtPayload,
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        ...basePayload,
        type: 'refresh',
        tokenId,
      } satisfies JwtPayload,
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as {
      exp?: number;
    };

    if (!decoded.exp) {
      throw new Error('Refresh token expiration could not be determined');
    }

    const entity = this.refreshTokenRepository.create({
      id: tokenId,
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
      revokedAt: null,
    });

    await this.refreshTokenRepository.save(entity);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: this.usersService.toPublicUser(user),
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        token,
        {
          secret:
            this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
