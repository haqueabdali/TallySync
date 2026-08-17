import {
  type INestApplication,
} from '@nestjs/common';
import {
  Test,
  type TestingModule,
} from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

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
      query: jest
        .fn()
        .mockResolvedValue([{ result: 1 }]),
    };

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        controllers: [
          HealthController,
        ],
        providers: [
          HealthService,
          {
            provide: DataSource,
            useValue: dataSource,
          },
        ],
      }).compile();

    app =
      moduleFixture.createNestApplication();

    await app.init();

    expect(app).toBeDefined();

    await expect(
      dataSource.query('SELECT 1'),
    ).resolves.toEqual([
      { result: 1 },
    ]);
  });
});