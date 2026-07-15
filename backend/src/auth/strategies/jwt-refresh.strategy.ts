import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly RefreshTokenEntityRepository: Repository<RefreshTokenEntity>,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('RefreshTokenEntity'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload & { rawToken: string }> {
    const rawToken: string = (req.body as { RefreshTokenEntity: string }).RefreshTokenEntity;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const storedToken = await this.RefreshTokenEntityRepository.findOne({
      where: { tokenHash, userId: payload.sub },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    return { ...payload, rawToken };
  }
}
