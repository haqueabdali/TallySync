import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { HealthService } from './health.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: {
    query: jest.Mock;
  };
  let lifecycle: { isDraining: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };
    lifecycle = { isDraining: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: ApplicationLifecycleService,
          useValue: lifecycle,
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns live status', () => {
    const result = service.live();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('tallysync-backend');
    expect(typeof result.uptimeSeconds).toBe('number');
  });

  it('returns not ready while the instance is draining', async () => {
    lifecycle.isDraining.mockReturnValue(true);

    const result = await service.ready();

    expect(result.status).toBe('error');
    expect(result.lifecycle).toBe('draining');
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('returns ready when database responds', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.ready();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('returns error when database is unavailable', async () => {
    dataSource.query.mockRejectedValue(new Error('database unavailable'));

    const result = await service.ready();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');
  });
});
