import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TallyRetryService } from './tally-retry.service';

type TallyHttpFailure = Error & {
  retryable?: boolean;
  status?: number;
};

@Injectable()
export class TallyHttpService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tallyRetryService: TallyRetryService,
  ) {}

  async postXml(
    xml: string,
    timeoutMilliseconds = 20_000,
  ): Promise<string> {
    const tallyUrl = this.getTallyUrl();

    try {
      return await this.tallyRetryService.execute(
        async () => {
          let response: Response;

          try {
            response = await fetch(tallyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                Accept: 'text/xml',
              },
              body: xml,
              signal: AbortSignal.timeout(timeoutMilliseconds),
            });
          } catch (error: unknown) {
            const failure = new Error(
              `Unable to connect to Tally at ${tallyUrl}: ${this.getErrorMessage(
                error,
              )}`,
            ) as TallyHttpFailure;

            failure.retryable = true;
            throw failure;
          }

          const responseText = await response.text();

          if (!response.ok) {
            const failure = new Error(
              `Tally returned HTTP ${response.status}`,
            ) as TallyHttpFailure;

            failure.status = response.status;
            failure.retryable =
              response.status === 408 ||
              response.status === 425 ||
              response.status === 429 ||
              response.status >= 500;

            Object.assign(failure, {
              responsePreview: responseText.substring(0, 10_000),
            });

            throw failure;
          }

          if (!responseText.trim()) {
            const failure = new Error(
              'Tally returned an empty response',
            ) as TallyHttpFailure;

            failure.retryable = true;
            throw failure;
          }

          return responseText;
        },
        (error) => this.isRetryable(error),
      );
    } catch (error: unknown) {
      const failure = error as TallyHttpFailure;

      if (failure?.status) {
        throw new BadGatewayException({
          message: failure.message,
          status: failure.status,
          responsePreview:
            (failure as TallyHttpFailure & {
              responsePreview?: string;
            }).responsePreview ?? null,
        });
      }

      throw new ServiceUnavailableException(
        this.getErrorMessage(error),
      );
    }
  }

  getUrl(): string {
    return this.getTallyUrl();
  }

  private isRetryable(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return Boolean((error as TallyHttpFailure).retryable);
  }

  private getTallyUrl(): string {
    return this.configService
      .get<string>('TALLY_URL', 'http://localhost:9000')
      .trim();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }
}
