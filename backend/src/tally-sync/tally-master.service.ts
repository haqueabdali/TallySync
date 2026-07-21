import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TallyBaseImportResult = {
  success: boolean;
  created: number;
  altered: number;
  ignored: number;
  errors: number;
  exceptions: number;
  lineError: string | null;
};

export type TallyMasterResult = TallyBaseImportResult & {
  masterType: 'Ledger' | 'Stock Item';
  masterName: string;
};

export type TallyLedgerDefinition = {
  name: string;
  parent: string;
  isBillWise: boolean;
};

export type TallyStockItemDefinition = {
  name: string;
  parent: string;
  baseUnit: string;
};

@Injectable()
export class TallyMasterService {
  private readonly ledgerCache = new Set<string>();
  private readonly stockItemCache = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  async ensureLedgerMasters(
    ledgers: TallyLedgerDefinition[],
  ): Promise<TallyMasterResult[]> {
    const uniqueLedgers = this.uniqueByName(ledgers);
    const results: TallyMasterResult[] = [];

    for (const ledger of uniqueLedgers) {
      this.validateLedgerDefinition(ledger);

      const cacheKey = this.normalizeName(ledger.name);

      if (this.ledgerCache.has(cacheKey)) {
        results.push(this.existingMasterResult('Ledger', ledger.name));
        continue;
      }

      const exists = await this.tallyLedgerExists(ledger.name);

      if (exists) {
        this.ledgerCache.add(cacheKey);
        results.push(this.existingMasterResult('Ledger', ledger.name));
        continue;
      }

      const result = await this.createTallyLedger(ledger);

      if (!result.success) {
        throw new BadGatewayException({
          message: `Unable to create Tally ledger "${ledger.name}"`,
          master: result,
        });
      }

      this.ledgerCache.add(cacheKey);
      results.push(result);
    }

    return results;
  }

  async ensureStockItemMasters(
    stockItems: TallyStockItemDefinition[],
  ): Promise<TallyMasterResult[]> {
    const uniqueStockItems = this.uniqueByName(stockItems);
    const results: TallyMasterResult[] = [];

    for (const stockItem of uniqueStockItems) {
      this.validateStockItemDefinition(stockItem);

      const cacheKey = this.normalizeName(stockItem.name);

      if (this.stockItemCache.has(cacheKey)) {
        results.push(
          this.existingMasterResult('Stock Item', stockItem.name),
        );
        continue;
      }

      const exists = await this.tallyStockItemExists(stockItem.name);

      if (exists) {
        this.stockItemCache.add(cacheKey);
        results.push(
          this.existingMasterResult('Stock Item', stockItem.name),
        );
        continue;
      }

      const result = await this.createTallyStockItem(stockItem);

      if (!result.success) {
        throw new BadGatewayException({
          message: `Unable to create Tally stock item "${stockItem.name}"`,
          master: result,
        });
      }

      this.stockItemCache.add(cacheKey);
      results.push(result);
    }

    return results;
  }

  clearCache(): void {
    this.ledgerCache.clear();
    this.stockItemCache.clear();
  }

  private async tallyLedgerExists(ledgerName: string): Promise<boolean> {
    const tallyCompanyName = this.getTallyCompanyName();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TSLedgerCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSLedgerCollection">
            <TYPE>Ledger</TYPE>
            <FETCH>Name</FETCH>
            <FILTER>TSLedgerNameFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="TSLedgerNameFilter">
            $Name = "${this.escapeTdlString(ledgerName)}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();

    const responseText = await this.postXmlToTally(requestXml, 10_000);
    return this.collectionContainsName(responseText, 'LEDGER', ledgerName);
  }

  private async tallyStockItemExists(
    stockItemName: string,
  ): Promise<boolean> {
    const tallyCompanyName = this.getTallyCompanyName();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TSStockItemCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSStockItemCollection">
            <TYPE>Stock Item</TYPE>
            <FETCH>Name</FETCH>
            <FILTER>TSStockItemNameFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="TSStockItemNameFilter">
            $Name = "${this.escapeTdlString(stockItemName)}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();

    const responseText = await this.postXmlToTally(requestXml, 10_000);
    return this.collectionContainsName(
      responseText,
      'STOCKITEM',
      stockItemName,
    );
  }

  private async createTallyLedger(
    ledger: TallyLedgerDefinition,
  ): Promise<TallyMasterResult> {
    const tallyCompanyName = this.getTallyCompanyName();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <IMPORTDUPS>@@DUPIGNORE</IMPORTDUPS>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="${this.escapeXml(ledger.name)}" ACTION="Create">
          <NAME>${this.escapeXml(ledger.name)}</NAME>
          <PARENT>${this.escapeXml(ledger.parent)}</PARENT>
          <ISBILLWISEON>${ledger.isBillWise ? 'Yes' : 'No'}</ISBILLWISEON>
          <AFFECTSSTOCK>${
            this.normalizeName(ledger.parent) ===
            this.normalizeName('Sales Accounts')
              ? 'Yes'
              : 'No'
          }</AFFECTSSTOCK>
        </LEDGER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
    `.trim();

    const responseText = await this.postXmlToTally(requestXml, 15_000);
    const parsed = this.parseTallyMasterImportResponse(responseText);

    return {
      ...parsed,
      masterType: 'Ledger',
      masterName: ledger.name,
    };
  }

  private async createTallyStockItem(
    stockItem: TallyStockItemDefinition,
  ): Promise<TallyMasterResult> {
    const tallyCompanyName = this.getTallyCompanyName();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <IMPORTDUPS>@@DUPIGNORE</IMPORTDUPS>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <STOCKITEM NAME="${this.escapeXml(
          stockItem.name,
        )}" ACTION="Create">
          <NAME>${this.escapeXml(stockItem.name)}</NAME>
          <PARENT>${this.escapeXml(stockItem.parent)}</PARENT>
          <BASEUNITS>${this.escapeXml(stockItem.baseUnit)}</BASEUNITS>
          <ADDITIONALUNITS></ADDITIONALUNITS>
          <ISBATCHWISEON>No</ISBATCHWISEON>
          <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
          <ISREVENUE>No</ISREVENUE>
        </STOCKITEM>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
    `.trim();

    const responseText = await this.postXmlToTally(requestXml, 15_000);
    const parsed = this.parseTallyMasterImportResponse(responseText);

    return {
      ...parsed,
      masterType: 'Stock Item',
      masterName: stockItem.name,
    };
  }

  private parseTallyMasterImportResponse(
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
    const success =
      errors === 0 &&
      exceptions === 0 &&
      !lineError &&
      (created > 0 || altered > 0 || ignored > 0 || status === 1);

    return {
      success,
      created,
      altered,
      ignored,
      errors,
      exceptions,
      lineError,
    };
  }

  private collectionContainsName(
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

  private async postXmlToTally(
    xml: string,
    timeoutMilliseconds: number,
  ): Promise<string> {
    const tallyUrl = this.getTallyUrl();
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
      throw new ServiceUnavailableException(
        `Unable to connect to Tally at ${tallyUrl}: ${this.getErrorMessage(
          error,
        )}`,
      );
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new BadGatewayException({
        message: `Tally returned HTTP ${response.status}`,
        responsePreview: responseText.substring(0, 10_000),
      });
    }

    if (!responseText.trim()) {
      throw new BadGatewayException('Tally returned an empty response');
    }

    return responseText;
  }

  private validateLedgerDefinition(ledger: TallyLedgerDefinition): void {
    if (!ledger.name?.trim()) {
      throw new BadRequestException('Tally ledger name is required');
    }

    if (!ledger.parent?.trim()) {
      throw new BadRequestException(
        `Parent group is required for Tally ledger "${ledger.name}"`,
      );
    }
  }

  private validateStockItemDefinition(
    stockItem: TallyStockItemDefinition,
  ): void {
    if (!stockItem.name?.trim()) {
      throw new BadRequestException('Tally stock item name is required');
    }

    if (!stockItem.parent?.trim()) {
      throw new BadRequestException(
        `Parent group is required for Tally stock item "${stockItem.name}"`,
      );
    }

    if (!stockItem.baseUnit?.trim()) {
      throw new BadRequestException(
        `Base unit is required for Tally stock item "${stockItem.name}"`,
      );
    }
  }

  private existingMasterResult(
    masterType: 'Ledger' | 'Stock Item',
    masterName: string,
  ): TallyMasterResult {
    return {
      success: true,
      masterType,
      masterName,
      created: 0,
      altered: 0,
      ignored: 0,
      errors: 0,
      exceptions: 0,
      lineError: null,
    };
  }

  private uniqueByName<T extends { name: string }>(items: T[]): T[] {
    const uniqueItems = new Map<string, T>();

    for (const item of items) {
      const key = this.normalizeName(item.name);

      if (!key) {
        throw new BadRequestException('Tally master name is required');
      }

      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, {
          ...item,
          name: item.name.trim(),
        });
      }
    }

    return Array.from(uniqueItems.values());
  }

  private extractXmlNumber(xml: string, tag: string): number {
    const value = this.extractXmlText(xml, tag);

    if (!value) {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractXmlText(xml: string, tag: string): string | null {
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

  private getTallyUrl(): string {
    return this.configService
      .get<string>('TALLY_URL', 'http://localhost:9000')
      .trim();
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

  private normalizeName(value: string): string {
    return String(value ?? '').trim().toLocaleLowerCase('en-US');
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeTdlString(value: string): string {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ');
  }

  private decodeXml(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
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