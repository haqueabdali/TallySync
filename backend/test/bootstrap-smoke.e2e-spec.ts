import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { RefreshTokenEntity } from '../src/auth/entities/refresh-token.entity';
import { UserEntity, UserStatus } from '../src/auth/entities/user.entity';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import {
  DEFAULT_JWT_AUDIENCE,
  DEFAULT_JWT_ISSUER,
} from '../src/auth/jwt.constants';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { PlatformAdminGuard } from '../src/licensing/guards/platform-admin.guard';
import { LicenseSessionService } from '../src/licensing/license-session.service';
import { PlatformCompaniesController } from '../src/platform-admin/platform-companies.controller';
import { PlatformCompaniesService } from '../src/platform-admin/platform-companies.service';

describe('Bootstrap Smoke', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('creates and initializes a Nest application', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ result: 1 }]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    expect(app).toBeDefined();

    await expect(dataSource.query('SELECT 1')).resolves.toEqual([
      { result: 1 },
    ]);
  });
});

describe('Platform owner authentication flow', () => {
  const jwtSecret = 'platform-owner-e2e-secret';
  const password = 'PlatformPass1!';
  const platformOwner = {
    id: '00000000-0000-4000-8000-000000000001',
    companyId: null,
    roleId: 'admin-role',
    fullName: 'TallySync Platform Owner',
    email: 'owner@tallysync.test',
    passwordHash: bcrypt.hashSync(password, 4),
    phone: null,
    status: UserStatus.ACTIVE,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    role: { id: 'admin-role', name: 'admin' },
    company: null,
    refreshTokens: [],
  } as UserEntity;
  const customerAdmin = {
    ...platformOwner,
    id: '00000000-0000-4000-8000-000000000002',
    companyId: '00000000-0000-4000-8000-000000000010',
    email: 'customer-admin@tallysync.test',
    fullName: 'Customer Administrator',
  } as UserEntity;

  let app: INestApplication;

  beforeAll(async () => {
    const users = [platformOwner, customerAdmin];
    const userRepository = {
      findOne: jest.fn(({ where }: { where: Partial<UserEntity> }) => {
        if (where.email) {
          return Promise.resolve(
            users.find((user) => user.email === where.email) ?? null,
          );
        }
        if (where.id) {
          return Promise.resolve(
            users.find((user) => user.id === where.id) ?? null,
          );
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const refreshTokenRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) =>
        Promise.resolve({ id: 'refresh-token-1', ...value }),
      ),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const licenseSessionService = {
      openSession: jest
        .fn()
        .mockResolvedValue({ id: '00000000-0000-4000-8000-000000000020' }),
      assertAndTouchSession: jest.fn().mockResolvedValue(undefined),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };
    const platformCompaniesService = {
      list: jest.fn().mockResolvedValue({
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      }),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return jwtSecret;
        throw new Error(`Unexpected configuration key: ${key}`);
      }),
      get: jest.fn().mockReturnValue(undefined),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt', session: false }),
        JwtModule.register({
          secret: jwtSecret,
          signOptions: {
            expiresIn: '15m',
            issuer: DEFAULT_JWT_ISSUER,
            audience: DEFAULT_JWT_AUDIENCE,
          },
        }),
      ],
      controllers: [AuthController, PlatformCompaniesController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        PlatformAdminGuard,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: refreshTokenRepository,
        },
        { provide: LicenseSessionService, useValue: licenseSessionService },
        { provide: ConfigService, useValue: configService },
        {
          provide: PlatformCompaniesService,
          useValue: platformCompaniesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    return response.body.accessToken as string;
  }

  it('logs in the platform owner and authorizes the companies endpoint', async () => {
    const accessToken = await login(platformOwner.email);

    const response = await request(app.getHttpServer())
      .get('/api/v1/platform/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ total: 0, data: [] });
  });

  it('logs in a customer admin but forbids platform company access', async () => {
    const accessToken = await login(customerAdmin.email);

    await request(app.getHttpServer())
      .get('/api/v1/platform/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
