import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, ApplicationLifecycleService],
  exports: [HealthService, ApplicationLifecycleService],
})
export class HealthModule {}
