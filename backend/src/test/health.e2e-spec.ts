import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

describe('Health E2E', () => {
  let app: INestApplication;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health/live returns 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'tallysync-backend',
      }),
    );
  });

  it('GET /health/ready returns 200 when DB is up', async () => {
    dataSource.query.mockResolvedValue([{ result: 1 }]);

    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        database: 'up',
      }),
    );
  });

  it('GET /health/ready returns 503 when DB is down', async () => {
    dataSource.query.mockRejectedValue(
      new Error('database unavailable'),
    );

    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'error',
        database: 'down',
      }),
    );
  });
});
