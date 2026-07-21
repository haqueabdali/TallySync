import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TallyRetryContext = {
  attempt: number;
  maxAttempts: number;
  delayMilliseconds: number;
};

@Injectable()
export class TallyRetryService {
  constructor(private readonly configService: ConfigService) {}

  async execute<T>(
    operation: (context: TallyRetryContext) => Promise<T>,
    shouldRetry: (error: unknown) => boolean,
  ): Promise<T> {
    const maxAttempts = this.getMaxAttempts();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const delayMilliseconds =
        attempt === 1 ? 0 : this.calculateDelay(attempt - 1);

      if (delayMilliseconds > 0) {
        await this.sleep(delayMilliseconds);
      }

      try {
        return await operation({
          attempt,
          maxAttempts,
          delayMilliseconds,
        });
      } catch (error: unknown) {
        lastError = error;

        if (attempt >= maxAttempts || !shouldRetry(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  getMaxAttempts(): number {
    const configured = Number(
      this.configService.get<string>('TALLY_HTTP_MAX_ATTEMPTS', '3'),
    );

    if (!Number.isFinite(configured) || configured < 1) {
      return 3;
    }

    return Math.min(Math.floor(configured), 10);
  }

  private calculateDelay(retryNumber: number): number {
    const baseDelay = this.getBaseDelayMilliseconds();
    const maxDelay = this.getMaxDelayMilliseconds();

    const exponentialDelay = baseDelay * 2 ** (retryNumber - 1);
    const jitter = Math.floor(Math.random() * Math.max(1, baseDelay / 2));

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private getBaseDelayMilliseconds(): number {
    const configured = Number(
      this.configService.get<string>(
        'TALLY_HTTP_RETRY_BASE_DELAY_MS',
        '500',
      ),
    );

    return Number.isFinite(configured) && configured >= 0
      ? configured
      : 500;
  }

  private getMaxDelayMilliseconds(): number {
    const configured = Number(
      this.configService.get<string>(
        'TALLY_HTTP_RETRY_MAX_DELAY_MS',
        '5000',
      ),
    );

    return Number.isFinite(configured) && configured >= 0
      ? configured
      : 5000;
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
