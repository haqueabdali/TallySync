import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TallyHttpService } from './tally-http.service';
import { TallyParserService } from './tally-parser.service';

export type TallyHealthResult = {
  connected: boolean;
  tallyUrl: string;
  tallyCompanyName: string;
  responseTimeMilliseconds: number;
  checkedAt: string;
  responsePreview: string;
};

@Injectable()
export class TallyHealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tallyHttpService: TallyHttpService,
    private readonly tallyParserService: TallyParserService,
  ) {}

  async checkConnection(): Promise<TallyHealthResult> {
    const tallyUrl = this.tallyHttpService.getUrl();
    const tallyCompanyName = this.getTallyCompanyName();
    const startedAt = Date.now();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Trial Balance</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(
          tallyCompanyName,
        )}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();

    try {
      const responseText = await this.tallyHttpService.postXml(
        requestXml,
        10_000,
      );

      if (!this.tallyParserService.isEnvelopeResponse(responseText)) {
        throw new ServiceUnavailableException(
          `Unexpected response from Tally: ${responseText.substring(0, 2_000)}`,
        );
      }

      return {
        connected: true,
        tallyUrl,
        tallyCompanyName,
        responseTimeMilliseconds: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        responsePreview: responseText.substring(0, 2_000),
      };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        `Unable to connect to Tally at ${tallyUrl}: ${this.getErrorMessage(
          error,
        )}`,
      );
    }
  }

  private getTallyCompanyName(): string {
    const companyName =
      this.configService.getOrThrow<string>('TALLY_COMPANY_NAME');

    if (!companyName.trim()) {
      throw new BadRequestException(
        'TALLY_COMPANY_NAME must not be empty',
      );
    }

    return companyName.trim();
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
