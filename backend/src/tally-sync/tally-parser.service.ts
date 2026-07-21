import { Injectable } from '@nestjs/common';

export type TallyBaseImportResult = {
  success: boolean;
  created: number;
  altered: number;
  ignored: number;
  errors: number;
  exceptions: number;
  lineError: string | null;
};

export type TallyVoucherImportResult = TallyBaseImportResult & {
  lastVoucherId: number;
  voucherNumber: string | null;
};

@Injectable()
export class TallyParserService {
  parseVoucherImportResponse(
    responseXml: string,
  ): TallyVoucherImportResult {
    const created = this.extractXmlNumber(responseXml, 'CREATED');
    const altered = this.extractXmlNumber(responseXml, 'ALTERED');
    const ignored = this.extractXmlNumber(responseXml, 'IGNORED');
    const errors = this.extractXmlNumber(responseXml, 'ERRORS');
    const exceptions = this.extractXmlNumber(responseXml, 'EXCEPTIONS');
    const lastVoucherId = this.extractXmlNumber(responseXml, 'LASTVCHID');
    const voucherNumber = this.extractXmlText(responseXml, 'VCHNUMBER');
    const lineError =
      this.extractXmlText(responseXml, 'LINEERROR') ??
      this.extractXmlText(responseXml, 'ERROR');

    return {
      success:
        errors === 0 &&
        exceptions === 0 &&
        !lineError &&
        created + altered > 0,
      created,
      altered,
      ignored,
      errors,
      exceptions,
      lastVoucherId,
      voucherNumber,
      lineError,
    };
  }

  parseMasterImportResponse(
    responseXml: string,
  ): TallyBaseImportResult {
    const created = this.extractXmlNumber(responseXml, 'CREATED');
    const altered = this.extractXmlNumber(responseXml, 'ALTERED');
    const ignored = this.extractXmlNumber(responseXml, 'IGNORED');
    const errors = this.extractXmlNumber(responseXml, 'ERRORS');
    const exceptions = this.extractXmlNumber(responseXml, 'EXCEPTIONS');
    const lineError =
      this.extractXmlText(responseXml, 'LINEERROR') ??
      this.extractXmlText(responseXml, 'ERROR');
    const status = this.extractXmlNumber(responseXml, 'STATUS');

    return {
      success:
        errors === 0 &&
        exceptions === 0 &&
        !lineError &&
        (created > 0 || altered > 0 || ignored > 0 || status === 1),
      created,
      altered,
      ignored,
      errors,
      exceptions,
      lineError,
    };
  }

  collectionContainsName(
    responseXml: string,
    elementName: 'LEDGER' | 'STOCKITEM',
    expectedName: string,
  ): boolean {
    const decodedXml = this.decodeXml(responseXml);
    const normalizedExpectedName = this.normalizeName(expectedName);

    const elementExpression = new RegExp(
      `<${elementName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${elementName}>`,
      'gi',
    );

    for (const match of decodedXml.matchAll(elementExpression)) {
      const elementXml = match[1] ?? '';
      const name = this.extractXmlText(elementXml, 'NAME');

      if (name && this.normalizeName(name) === normalizedExpectedName) {
        return true;
      }
    }

    return false;
  }

  isEnvelopeResponse(responseXml: string): boolean {
    return /<ENVELOPE(?:\s|>)/i.test(responseXml);
  }

  buildVoucherFailureMessage(
    result: TallyVoucherImportResult,
  ): string {
    if (result.lineError) {
      return `Tally rejected the sales voucher: ${result.lineError}`;
    }

    if (result.exceptions > 0) {
      return `Tally placed the sales voucher in Import Exceptions (${result.exceptions} exception)`;
    }

    if (result.errors > 0) {
      return `Tally rejected the sales voucher with ${result.errors} error(s)`;
    }

    return 'Tally did not create or alter the sales voucher';
  }

  extractXmlNumber(xml: string, tag: string): number {
    const value = this.extractXmlText(xml, tag);

    if (!value) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  extractXmlText(xml: string, tag: string): string | null {
    const expression = new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      'i',
    );

    const match = xml.match(expression);

    if (!match?.[1]) {
      return null;
    }

    return this.decodeXml(match[1].trim());
  }

  decodeXml(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private normalizeName(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
