import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { CompanyEntity } from './entities/company.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.getOrThrow<string>('JWT_SECRET');

        const expiresIn =
          (config.get<string>('JWT_EXPIRES_IN') ?? '15m') as StringValue;

        return {
          secret,
          signOptions: {
            expiresIn,
            issuer: config.get<string>('JWT_ISSUER') ?? 'tallysync-api',
            audience: config.get<string>('JWT_AUDIENCE') ?? 'tallysync-app',
          },
        };
      },
    }),

    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      CompanyEntity,
      RefreshTokenEntity,
    ]),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],

  exports: [
    AuthService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}