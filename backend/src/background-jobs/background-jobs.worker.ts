import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { BackgroundJobsService } from './background-jobs.service';

@Injectable()
export class BackgroundJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    BackgroundJobsWorker.name,
  );

  private readonly workerId = `worker-${randomUUID()}`;

  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopping = false;

  constructor(
    private readonly jobsService: BackgroundJobsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const nodeEnv = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    if (nodeEnv.toLowerCase() === 'test') {
      this.logger.log(
        'Background job worker is disabled in test environment',
      );
      return;
    }

    const enabled = this.configService.get<string>(
      'BACKGROUND_JOBS_ENABLED',
      'true',
    );

    if (enabled.toLowerCase() !== 'true') {
      this.logger.log(
        'Background job worker is disabled',
      );
      return;
    }

    this.stopping = false;

    const intervalMs = this.getPositiveInteger(
      'BACKGROUND_JOBS_POLL_INTERVAL_MS',
      5000,
    );

    const staleSeconds = this.getPositiveInteger(
      'BACKGROUND_JOBS_STALE_AFTER_SECONDS',
      900,
    );

    void this.jobsService
      .recoverStaleJobs(staleSeconds)
      .catch((error: unknown) => {
        if (!this.stopping) {
          this.logger.error(
            this.getErrorMessage(error),
          );
        }
      });

    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    this.timer.unref();

    void this.tick();
  }

  onModuleDestroy(): void {
    this.stopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running || this.stopping) {
      return;
    }

    this.running = true;

    try {
      const batchSize = this.getPositiveInteger(
        'BACKGROUND_JOBS_BATCH_SIZE',
        10,
      );

      for (
        let index = 0;
        index < batchSize && !this.stopping;
        index += 1
      ) {
        const processed =
          await this.jobsService.processNext(
            this.workerId,
          );

        if (!processed) {
          break;
        }
      }
    } catch (error: unknown) {
      if (!this.stopping) {
        this.logger.error(
          this.getErrorMessage(error),
        );
      }
    } finally {
      this.running = false;
    }
  }

  private getPositiveInteger(
    key: string,
    fallback: number,
  ): number {
    const raw =
      this.configService.get<string>(key);

    const parsed = raw
      ? Number.parseInt(raw, 10)
      : fallback;

    return Number.isInteger(parsed) &&
      parsed > 0
      ? parsed
      : fallback;
  }

  private getErrorMessage(
    error: unknown,
  ): string {
    return error instanceof Error
      ? error.message
      : 'Unknown worker error';
  }
}
