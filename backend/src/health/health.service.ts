import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { HealthCheckResponse } from './health-response.interface';
import { ApplicationLifecycleService } from './application-lifecycle.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly lifecycle: ApplicationLifecycleService,
  ) {}

  live(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'tallysync-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async ready(): Promise<HealthCheckResponse> {
    if (this.lifecycle.isDraining()) {
      return {
        status: 'error',
        service: 'tallysync-backend',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: 'up',
        lifecycle: 'draining',
      };
    }

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        service: 'tallysync-backend',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: 'up',
      };
    } catch {
      return {
        status: 'error',
        service: 'tallysync-backend',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: 'down',
      };
    }
  }
}
