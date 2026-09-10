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

export type ParsedTallyLedger = {
  name: string;
  guid: string | null;
  alterId: string | null;
  parent: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type ParsedTallyStockItem = {
  name: string;
  guid: string | null;
  alterId: string | null;
  parent: string | null;
  baseUnit: string | null;
  closingBalance: string | null;
  closingRate: string | null;
  closingValue: string | null;
};

@Injectable()
export class TallyParserService {
  parseVoucherImportResponse(responseXml: string): TallyVoucherImportResult {
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
        errors === 0 && exceptions === 0 && !lineError && created + altered > 0,
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

  parseMasterImportResponse(responseXml: string): TallyBaseImportResult {
    const created = this.extractXmlNumber(responseXml, 'CREATED');
    const altered = this.extractXmlNumber(responseXml, 'ALTERED');
    const ignored = this.extractXmlNumber(responseXml, 'IGNORED');
    const errors = this.extractXmlNumber(responseXml, 'ERRORS');
    const exceptions = this.extractXmlNumber(responseXml, 'EXCEPTIONS');

    const lineError =
      this.extractXmlText(responseXml, 'LINEERROR') ??
      this.extractXmlText(responseXml, 'ERROR');

    return {
      success:
        errors === 0 &&
        exceptions === 0 &&
        !lineError &&
        (created > 0 || altered > 0 || ignored > 0),
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

  parseLedgerCollection(responseXml: string): ParsedTallyLedger[] {
    const ledgers: ParsedTallyLedger[] = [];

    for (const elementXml of this.extractElements(responseXml, 'LEDGER')) {
      const name = this.extractXmlText(elementXml, 'NAME');

      if (!name) {
        continue;
      }

      ledgers.push({
        name,
        guid: this.extractXmlText(elementXml, 'GUID'),
        alterId: this.extractXmlText(elementXml, 'ALTERID'),
        parent: this.extractXmlText(elementXml, 'PARENT'),
        email: this.extractXmlText(elementXml, 'EMAIL'),
        phone:
          this.extractXmlText(elementXml, 'LEDGERPHONE') ??
          this.extractXmlText(elementXml, 'PHONE'),
        address: this.extractAddress(elementXml),
      });
    }

    return ledgers;
  }

  parseStockItemCollection(responseXml: string): ParsedTallyStockItem[] {
    const stockItems: ParsedTallyStockItem[] = [];

    for (const elementXml of this.extractElements(responseXml, 'STOCKITEM')) {
      const name = this.extractXmlText(elementXml, 'NAME');

      if (!name) {
        continue;
      }

      stockItems.push({
        name,
        guid: this.extractXmlText(elementXml, 'GUID'),
        alterId: this.extractXmlText(elementXml, 'ALTERID'),
        parent: this.extractXmlText(elementXml, 'PARENT'),
        baseUnit: this.extractXmlText(elementXml, 'BASEUNITS'),
        closingBalance: this.extractXmlText(elementXml, 'CLOSINGBALANCE'),
        closingRate: this.extractXmlText(elementXml, 'CLOSINGRATE'),
        closingValue: this.extractXmlText(elementXml, 'CLOSINGVALUE'),
      });
    }

    return stockItems;
  }

  isEnvelopeResponse(responseXml: string): boolean {
    return /<ENVELOPE(?:\s|>)/i.test(responseXml);
  }

  buildVoucherFailureMessage(result: TallyVoucherImportResult): string {
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

  private extractElements(xml: string, elementName: string): string[] {
    const decodedXml = this.decodeXml(xml);

    const expression = new RegExp(
      `<${elementName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${elementName}>`,
      'gi',
    );

    return Array.from(decodedXml.matchAll(expression))
      .map((match) => match[1] ?? '')
      .filter((value) => value.length > 0);
  }

  private extractAddress(elementXml: string): string | null {
    const addressListMatch = elementXml.match(
      /<ADDRESS\.LIST(?:\s[^>]*)?>([\s\S]*?)<\/ADDRESS\.LIST>/i,
    );

    const source = addressListMatch?.[1] ?? elementXml;

    const parts = Array.from(
      source.matchAll(/<ADDRESS(?:\s[^>]*)?>([\s\S]*?)<\/ADDRESS>/gi),
    )
      .map((match) => this.decodeXml((match[1] ?? '').trim()))
      .filter((value) => value.length > 0);

    return parts.length > 0 ? parts.join(', ') : null;
  }
  private normalizeName(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
