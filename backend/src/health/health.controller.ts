import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import type { HealthCheckResponse } from './health-response.interface';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
  ) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process liveness check',
  })
  @ApiOkResponse({
    description: 'Application process is alive',
  })
  live(): HealthCheckResponse {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Application readiness check',
  })
  @ApiOkResponse({
    description:
      'Application and database are ready',
  })
  @ApiServiceUnavailableResponse({
    description:
      'Database is unavailable',
  })
  async ready(
    @Res({ passthrough: true })
    response: Response,
  ): Promise<HealthCheckResponse> {
    const result =
      await this.healthService.ready();

    response.status(
      result.status === 'ok'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE,
    );

    return result;
  }
}
