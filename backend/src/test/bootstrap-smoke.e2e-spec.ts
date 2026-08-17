import { type INestApplication, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { HealthModule } from '../src/health/health.module';

@Module({
  imports: [HealthModule],
})
class SmokeTestModule {}

describe('Bootstrap Smoke', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('creates and initializes the Nest application', async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [SmokeTestModule],
      })
        .overrideProvider(DataSource)
        .useValue({
          query: jest.fn().mockResolvedValue([{ result: 1 }]),
        })
        .compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    expect(app).toBeDefined();
  });
});
