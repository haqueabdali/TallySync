import {
  Test,
  type TestingModule,
} from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: {
    query: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          HealthService,
          {
            provide: DataSource,
            useValue: dataSource,
          },
        ],
      }).compile();

    service =
      module.get(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns live status', () => {
    const result = service.live();

    expect(result.status).toBe('ok');
    expect(result.service).toBe(
      'tallysync-backend',
    );
    expect(
      typeof result.uptimeSeconds,
    ).toBe('number');
  });

  it('returns ready when database responds', async () => {
    dataSource.query.mockResolvedValue([
      { '?column?': 1 },
    ]);

    const result =
      await service.ready();

    expect(dataSource.query).toHaveBeenCalledWith(
      'SELECT 1',
    );
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('returns error when database is unavailable', async () => {
    dataSource.query.mockRejectedValue(
      new Error('database unavailable'),
    );

    const result =
      await service.ready();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');
  });
});
