import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { HealthCheckResponse } from './health-response.interface';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
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
