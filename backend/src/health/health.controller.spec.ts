import {
  HttpStatus,
} from '@nestjs/common';
import {
  Test,
  type TestingModule,
} from '@nestjs/testing';
import type { Response } from 'express';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: {
    live: jest.Mock;
    ready: jest.Mock;
  };

  beforeEach(async () => {
    healthService = {
      live: jest.fn(),
      ready: jest.fn(),
    };

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [
          HealthController,
        ],
        providers: [
          {
            provide: HealthService,
            useValue: healthService,
          },
        ],
      }).compile();

    controller =
      module.get(HealthController);
  });

  it('returns liveness result', () => {
    healthService.live.mockReturnValue({
      status: 'ok',
      service: 'tallysync-backend',
      timestamp:
        '2026-08-07T00:00:00.000Z',
      uptimeSeconds: 100,
    });

    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'tallysync-backend',
      timestamp:
        '2026-08-07T00:00:00.000Z',
      uptimeSeconds: 100,
    });
  });

  it('uses 200 for successful readiness', async () => {
    healthService.ready.mockResolvedValue({
      status: 'ok',
      service: 'tallysync-backend',
      timestamp:
        '2026-08-07T00:00:00.000Z',
      uptimeSeconds: 100,
      database: 'up',
    });

    const status = jest.fn();

    const response = {
      status,
    } as unknown as Response;

    await controller.ready(response);

    expect(status).toHaveBeenCalledWith(
      HttpStatus.OK,
    );
  });

  it('uses 503 when database is down', async () => {
    healthService.ready.mockResolvedValue({
      status: 'error',
      service: 'tallysync-backend',
      timestamp:
        '2026-08-07T00:00:00.000Z',
      uptimeSeconds: 100,
      database: 'down',
    });

    const status = jest.fn();

    const response = {
      status,
    } as unknown as Response;

    await controller.ready(response);

    expect(status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});
