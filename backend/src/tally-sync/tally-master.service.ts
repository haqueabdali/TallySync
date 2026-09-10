import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TallyHttpService } from './tally-http.service';
import { TallyParserService } from './tally-parser.service';
import { TallyCacheService } from './tally-cache.service';

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
  private readonly logger = new Logger(TallyMasterService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tallyHttpService: TallyHttpService,
    private readonly tallyParserService: TallyParserService,
    private readonly tallyCacheService: TallyCacheService,
  ) {}

  async ensureLedgerMasters(
    ledgers: TallyLedgerDefinition[],
    options?: {
      forceVerify?: boolean;
    },
  ): Promise<TallyMasterResult[]> {
    const uniqueLedgers = this.uniqueByName(ledgers);
    const results: TallyMasterResult[] = [];
    const forceVerify = options?.forceVerify === true;

    for (const ledger of uniqueLedgers) {
      this.validateLedgerDefinition(ledger);

      const cacheKey = this.normalizeName(ledger.name);

      if (!forceVerify && this.tallyCacheService.hasLedger(cacheKey)) {
        results.push(this.existingMasterResult('Ledger', ledger.name));
        continue;
      }

      const exists = await this.tallyLedgerExists(ledger.name);

      if (exists) {
        this.tallyCacheService.rememberLedger(cacheKey);
        results.push(this.existingMasterResult('Ledger', ledger.name));
        continue;
      }

      const result = await this.createTallyLedger(ledger);

      const masterWasCreatedOrAltered =
        result.created > 0 || result.altered > 0;

      if (!result.success || !masterWasCreatedOrAltered) {
        const reason = result.lineError?.trim();

        const message = reason
          ? `Unable to create Tally ledger "${ledger.name}": ${reason}`
          : result.ignored > 0
            ? `Tally ignored ledger "${ledger.name}" without creating or altering it`
            : `Unable to create Tally ledger "${ledger.name}"`;

        throw new BadGatewayException({
          message,
          master: result,
        });
      }

      this.tallyCacheService.rememberLedger(cacheKey);
      results.push(result);
    }

    return results;
  }

  async ensureStockItemMasters(
    stockItems: TallyStockItemDefinition[],
    options?: {
      forceVerify?: boolean;
    },
  ): Promise<TallyMasterResult[]> {
    const uniqueStockItems = this.uniqueByName(stockItems);
    const results: TallyMasterResult[] = [];
    const forceVerify = options?.forceVerify === true;

    for (const stockItem of uniqueStockItems) {
      this.validateStockItemDefinition(stockItem);

      const cacheKey = this.normalizeName(stockItem.name);

      if (!forceVerify && this.tallyCacheService.hasStockItem(cacheKey)) {
        results.push(this.existingMasterResult('Stock Item', stockItem.name));
        continue;
      }

      const exists = await this.tallyStockItemExists(stockItem.name);

      if (exists) {
        this.tallyCacheService.rememberStockItem(cacheKey);
        results.push(this.existingMasterResult('Stock Item', stockItem.name));
        continue;
      }

      const result = await this.createTallyStockItem(stockItem);

      const masterWasCreatedOrAltered =
        result.created > 0 || result.altered > 0;

      if (!result.success || !masterWasCreatedOrAltered) {
        const reason = result.lineError?.trim();

        const message = reason
          ? `Unable to create Tally stock item "${stockItem.name}": ${reason}`
          : result.ignored > 0
            ? `Tally ignored stock item "${stockItem.name}" without creating or altering it`
            : `Unable to create Tally stock item "${stockItem.name}"`;

        throw new BadGatewayException({
          message,
          master: result,
        });
      }

      this.tallyCacheService.rememberStockItem(cacheKey);
      results.push(result);
    }

    return results;
  }

  clearCache(): void {
    this.tallyCacheService.clear();
  }

  async findLedgerMaster(ledgerName: string): Promise<{
    name: string;
    guid: string | null;
    alterId: string | null;
    parent: string | null;
  } | null> {
    const name = ledgerName?.trim();

    if (!name) {
      throw new BadRequestException('Tally ledger name is required');
    }

    const tallyCompanyName = this.getTallyCompanyName();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TSLedgerIdentityCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSLedgerIdentityCollection">
            <TYPE>Ledger</TYPE>
            <FETCH>Name,GUID,AlterID,Parent</FETCH>
            <FILTER>TSLedgerIdentityFilter</FILTER>
          </COLLECTION>

          <SYSTEM TYPE="Formulae" NAME="TSLedgerIdentityFilter">
            $Name = "${this.escapeTdlString(name)}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
  `.trim();

    const responseText = await this.tallyHttpService.postXml(
      requestXml,
      10_000,
    );

    const ledger = this.tallyParserService
      .parseLedgerCollection(responseText)
      .find(
        (candidate) =>
          this.normalizeName(candidate.name) === this.normalizeName(name),
      );

    if (!ledger) {
      return null;
    }

    return {
      name: ledger.name,
      guid: ledger.guid,
      alterId: ledger.alterId,
      parent: ledger.parent,
    };
  }

  async findStockItemMaster(stockItemName: string): Promise<{
    name: string;
    guid: string | null;
    alterId: string | null;
    parent: string | null;
    baseUnit: string | null;
  } | null> {
    const name = stockItemName?.trim();

    if (!name) {
      throw new BadRequestException('Tally stock item name is required');
    }

    const tallyCompanyName = this.getTallyCompanyName();

    const requestXml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TSStockItemIdentityCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSStockItemIdentityCollection">
            <TYPE>Stock Item</TYPE>
            <FETCH>Name,GUID,AlterID,Parent,BaseUnits</FETCH>
            <FILTER>TSStockItemIdentityFilter</FILTER>
          </COLLECTION>

          <SYSTEM TYPE="Formulae" NAME="TSStockItemIdentityFilter">
            $Name = "${this.escapeTdlString(name)}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
  `.trim();

    const responseText = await this.tallyHttpService.postXml(
      requestXml,
      10_000,
    );

    const stockItem = this.tallyParserService
      .parseStockItemCollection(responseText)
      .find(
        (candidate) =>
          this.normalizeName(candidate.name) === this.normalizeName(name),
      );

    if (!stockItem) {
      return null;
    }

    return {
      name: stockItem.name,
      guid: stockItem.guid,
      alterId: stockItem.alterId,
      parent: stockItem.parent,
      baseUnit: stockItem.baseUnit,
    };
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

    const responseText = await this.tallyHttpService.postXml(
      requestXml,
      10_000,
    );
    return this.tallyParserService.collectionContainsName(
      responseText,
      'LEDGER',
      ledgerName,
    );
  }

  private async tallyStockItemExists(stockItemName: string): Promise<boolean> {
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

    const responseText = await this.tallyHttpService.postXml(
      requestXml,
      10_000,
    );
    return this.tallyParserService.collectionContainsName(
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

    const responseText = await this.tallyHttpService.postXml(
      requestXml,
      15_000,
    );

    const parsed =
      this.tallyParserService.parseMasterImportResponse(responseText);

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
        <STOCKITEM NAME="${this.escapeXml(stockItem.name)}" ACTION="Create">
          <NAME>${this.escapeXml(stockItem.name)}</NAME>
          <PARENT>${this.escapeXml(
            this.toTallyStockGroupParent(stockItem.parent),
          )}</PARENT>
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

    const responseText = await this.tallyHttpService.postXml(
      requestXml,
      15_000,
    );

    this.logger.log(
      `Tally Stock Item import result for "${stockItem.name}": ${responseText}`,
    );
    const parsed =
      this.tallyParserService.parseMasterImportResponse(responseText);

    return {
      ...parsed,
      masterType: 'Stock Item',
      masterName: stockItem.name,
    };
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
  private toTallyStockGroupParent(parent: string | null | undefined): string {
    const normalized = String(parent ?? '').trim();

    if (!normalized) {
      return '';
    }

    if (this.normalizeName(normalized) === 'primary') {
      return '';
    }

    return normalized;
  }
  private validateStockItemDefinition(
    stockItem: TallyStockItemDefinition,
  ): void {
    if (!stockItem.name?.trim()) {
      throw new BadRequestException('Tally stock item name is required');
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

  private getTallyCompanyName(): string {
    const companyName =
      this.configService.getOrThrow<string>('TALLY_COMPANY_NAME');

    if (!companyName.trim()) {
      throw new BadRequestException('TALLY_COMPANY_NAME must not be empty');
    }

    return companyName.trim();
  }

  private normalizeName(value: string): string {
    return String(value ?? '')
      .trim()
      .toLocaleLowerCase('en-US');
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
