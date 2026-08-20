import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { LicenseSessionService } from '../../licensing/license-session.service';
<<<<<<< HEAD
import { DEFAULT_JWT_AUDIENCE, DEFAULT_JWT_ISSUER } from '../jwt.constants';
=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly requireSessionIds: boolean;

  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly licenseSessionService: LicenseSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      issuer: config.get<string>('JWT_ISSUER') ?? DEFAULT_JWT_ISSUER,
      audience: config.get<string>('JWT_AUDIENCE') ?? DEFAULT_JWT_AUDIENCE,
    });

    this.requireSessionIds =
      config.get<string>('LICENSE_REQUIRE_SESSION_IDS') === 'true';
  }

  /**
   * Called after Passport verifies the JWT signature and expiry.
   * We re-validate the user against the database on every request so that
   * suspended / deleted accounts are rejected immediately, without waiting
   * for the token to expire.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('User account has been deleted');
    }

    if (payload.sid) {
      await this.licenseSessionService.assertAndTouchSession(
        payload.sid,
        user.id,
        user.companyId,
      );
    } else if (this.requireSessionIds) {
      throw new UnauthorizedException('Authentication session is required');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      companyId: user.companyId,
      fullName: user.fullName,
    };
  }
}
