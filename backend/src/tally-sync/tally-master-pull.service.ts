import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ItemEntity } from '../items/entities/item.entity';
import { ItemSyncStatus } from '../items/enums/item-sync-status.enum';
import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { TallyHttpService } from './tally-http.service';
import { TallyParserService } from './tally-parser.service';

export type TallyPulledLedger = {
  name: string;
  guid: string | null;
  alterId: string | null;
  parent: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type TallyPulledStockItem = {
  name: string;
  guid: string | null;
  alterId: string | null;
  parent: string | null;
  baseUnit: string | null;
  closingBalance: string | null;
  closingRate: string | null;
  closingValue: string | null;
};

export type TallyMasterPreviewResult = {
  companyName: string;
  ledgers: TallyPulledLedger[];
  stockItems: TallyPulledStockItem[];
  counts: {
    ledgers: number;
    stockItems: number;
  };
};

export type TallyMasterPullResult = {
  companyName: string;
  customers: {
    received: number;
    eligible: number;
    created: number;
    updated: number;
    skipped: number;
  };
  stockItems: {
    received: number;
    created: number;
    updated: number;
    skipped: number;
  };
};

@Injectable()
export class TallyMasterPullService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tallyHttpService: TallyHttpService,
    private readonly tallyParserService: TallyParserService,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async previewMasters(): Promise<TallyMasterPreviewResult> {
    const companyName = this.getTallyCompanyName();

    const [ledgerXml, stockItemXml] = await Promise.all([
      this.tallyHttpService.postXml(
        this.buildLedgerCollectionRequest(companyName),
        20_000,
      ),
      this.tallyHttpService.postXml(
        this.buildStockItemCollectionRequest(companyName),
        20_000,
      ),
    ]);

    const ledgers = this.tallyParserService.parseLedgerCollection(ledgerXml);

    const stockItems =
      this.tallyParserService.parseStockItemCollection(stockItemXml);

    return {
      companyName,
      ledgers,
      stockItems,
      counts: {
        ledgers: ledgers.length,
        stockItems: stockItems.length,
      },
    };
  }

  async pullMasters(companyId: string): Promise<TallyMasterPullResult> {
    const preview = await this.previewMasters();

    const customerLedgers = preview.ledgers.filter(
      (ledger) =>
        this.normalizeName(ledger.parent) ===
        this.normalizeName('Sundry Debtors'),
    );

    let customersCreated = 0;
    let customersUpdated = 0;
    let customersSkipped = 0;

    for (const ledger of customerLedgers) {
      const name = ledger.name.trim();
      const guid = this.normalizeExternalId(ledger.guid);
      const alterId = this.normalizeAlterId(ledger.alterId);

      if (!name || !guid) {
        customersSkipped += 1;
        continue;
      }

      const existing = await this.findCustomer(companyId, guid, name);

      if (existing) {
        existing.name = name;
        existing.tallyLedgerId = guid;
        existing.tallyLedgerName = name;
        existing.tallyAlterId = alterId;
        existing.isActive = true;

        if (ledger.phone) {
          existing.phone = ledger.phone.substring(0, 32);
        }

        if (ledger.address) {
          existing.address = ledger.address;
        }

        if (ledger.email) {
          const emailAvailable = await this.isCustomerEmailAvailable(
            companyId,
            ledger.email,
            existing.id,
          );

          if (emailAvailable) {
            existing.email = ledger.email;
          }
        }

        await this.customerRepository.save(existing);
        customersUpdated += 1;
        continue;
      }

      let email: string | null = null;

      if (
        ledger.email &&
        (await this.isCustomerEmailAvailable(companyId, ledger.email))
      ) {
        email = ledger.email;
      }

      const customer = this.customerRepository.create({
        companyId,
        name,
        email,
        phone: ledger.phone ? ledger.phone.substring(0, 32) : null,
        address: ledger.address,
        tallyLedgerId: guid,
        tallyLedgerName: name,
        tallyAlterId: alterId,
        creditLimit: 0,
        isActive: true,
      });

      await this.customerRepository.save(customer);
      customersCreated += 1;
    }

    let stockItemsCreated = 0;
    let stockItemsUpdated = 0;
    let stockItemsSkipped = 0;

    for (const tallyItem of preview.stockItems) {
      const name = tallyItem.name.trim();
      const guid = this.normalizeExternalId(tallyItem.guid);
      const alterId = this.normalizeAlterId(tallyItem.alterId);

      if (!name || !guid) {
        stockItemsSkipped += 1;
        continue;
      }

      const existing = await this.findItem(companyId, guid, name);

      const currentStock = this.parseTallyQuantity(tallyItem.closingBalance);

      const unit = this.normalizeUnit(tallyItem.baseUnit);

      if (existing) {
        existing.name = name;
        existing.tallyStockItemId = guid;
        existing.tallyItemName = name;
        existing.tallyAlterId = alterId;
        existing.unit = unit;

        if (currentStock !== null) {
          existing.currentStock = currentStock;
        }

        existing.syncStatus = ItemSyncStatus.SYNCED;
        existing.syncError = null;
        existing.lastSyncedAt = new Date();
        existing.isActive = true;

        await this.itemRepository.save(existing);
        stockItemsUpdated += 1;
        continue;
      }

      const item = this.itemRepository.create({
        companyId,
        categoryId: null,
        sku: await this.generateTallySku(companyId, name),
        barcode: null,
        name,
        description: null,
        unit,
        purchasePrice: 0,
        sellingPrice: 0,
        taxRate: 0,

        // Closing balance is the current Tally stock, not
        // the accounting opening balance.
        openingStock: 0,
        currentStock: currentStock ?? 0,

        minimumStock: 0,
        trackInventory: true,
        hsnCode: null,

        tallyStockItemId: guid,
        tallyItemName: name,
        tallyAlterId: alterId,

        syncStatus: ItemSyncStatus.SYNCED,
        syncError: null,
        lastSyncedAt: new Date(),
        isActive: true,
      });

      await this.itemRepository.save(item);
      stockItemsCreated += 1;
    }

    return {
      companyName: preview.companyName,

      customers: {
        received: preview.ledgers.length,
        eligible: customerLedgers.length,
        created: customersCreated,
        updated: customersUpdated,
        skipped: customersSkipped,
      },

      stockItems: {
        received: preview.stockItems.length,
        created: stockItemsCreated,
        updated: stockItemsUpdated,
        skipped: stockItemsSkipped,
      },
    };
  }

  private async findCustomer(
    companyId: string,
    guid: string,
    tallyName: string,
  ): Promise<CustomerEntity | null> {
    const byGuid = await this.customerRepository.findOne({
      where: {
        companyId,
        tallyLedgerId: guid,
        deletedAt: IsNull(),
      },
    });

    if (byGuid) {
      return byGuid;
    }

    /*
     * Legacy adoption path:
     * records imported before GUID support have only
     * tallyLedgerName/name. This fallback upgrades that same
     * row during the first GUID-aware pull.
     */
    const normalizedName = this.normalizeName(tallyName);

    const customers = await this.customerRepository.find({
      where: {
        companyId,
        deletedAt: IsNull(),
      },
    });

    return (
      customers.find(
        (customer) =>
          !customer.tallyLedgerId &&
          (this.normalizeName(customer.tallyLedgerName) === normalizedName ||
            this.normalizeName(customer.name) === normalizedName),
      ) ?? null
    );
  }

  private async findItem(
    companyId: string,
    guid: string,
    tallyName: string,
  ): Promise<ItemEntity | null> {
    const byGuid = await this.itemRepository.findOne({
      where: {
        companyId,
        tallyStockItemId: guid,
        deletedAt: IsNull(),
      },
    });

    if (byGuid) {
      return byGuid;
    }

    /*
     * Legacy adoption path:
     * before GUID support tallyStockItemId temporarily contained
     * the Tally item name. Match that row once and replace the
     * temporary value with the stable GUID.
     */
    const normalizedName = this.normalizeName(tallyName);

    const items = await this.itemRepository.find({
      where: {
        companyId,
        deletedAt: IsNull(),
      },
    });

    return (
      items.find((item) => {
        const legacyExternalId = this.normalizeName(item.tallyStockItemId);

        const tallyItemName = this.normalizeName(item.tallyItemName);

        const localName = this.normalizeName(item.name);

        const hasRealGuid = this.looksLikeTallyGuid(item.tallyStockItemId);

        return (
          !hasRealGuid &&
          (legacyExternalId === normalizedName ||
            tallyItemName === normalizedName ||
            localName === normalizedName)
        );
      }) ?? null
    );
  }

  private async isCustomerEmailAvailable(
    companyId: string,
    email: string,
    excludeCustomerId?: string,
  ): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return false;
    }

    const customers = await this.customerRepository.find({
      where: {
        companyId,
        deletedAt: IsNull(),
      },
    });

    return !customers.some(
      (customer) =>
        customer.id !== excludeCustomerId &&
        customer.email?.trim().toLowerCase() === normalizedEmail,
    );
  }

  private async generateTallySku(
    companyId: string,
    name: string,
  ): Promise<string> {
    const normalizedName = name
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const base = `TALLY-${normalizedName || 'ITEM'}`.substring(0, 42);

    let candidate = base;
    let suffix = 1;

    while (
      await this.itemRepository.findOne({
        where: {
          companyId,
          sku: candidate,
          deletedAt: IsNull(),
        },
      })
    ) {
      suffix += 1;

      const suffixText = `-${suffix}`;

      candidate = `${base.substring(0, 50 - suffixText.length)}${suffixText}`;
    }

    return candidate.substring(0, 50);
  }

  private parseTallyQuantity(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(/,/g, '').trim();

    const match = normalized.match(/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)/);

    if (!match) {
      return null;
    }

    const quantity = Number(match[0]);

    return Number.isFinite(quantity) ? quantity : null;
  }

  private normalizeUnit(value: string | null): string {
    if (!value) {
      return 'PCS';
    }

    const normalized = value.trim();

    if (
      !normalized ||
      normalized.includes('&#4;') ||
      normalized.toLowerCase() === 'not applicable'
    ) {
      return 'PCS';
    }

    return normalized.substring(0, 30).toUpperCase();
  }

  private normalizeExternalId(value: string | null): string | null {
    const normalized = value?.trim();

    return normalized ? normalized.substring(0, 150) : null;
  }

  private normalizeAlterId(value: string | null): string | null {
    const normalized = value?.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private looksLikeTallyGuid(value: string | null): boolean {
    if (!value) {
      return false;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]+$/i.test(
      value.trim(),
    );
  }

  private normalizeName(value: string | null): string {
    return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private buildLedgerCollectionRequest(companyName: string): string {
    return `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TSAllLedgerCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSAllLedgerCollection">
            <TYPE>Ledger</TYPE>
            <FETCH>Name,GUID,AlterID,Parent,Email,LedgerPhone,Address</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();
  }

  private buildStockItemCollectionRequest(companyName: string): string {
    return `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TSAllStockItemCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(companyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSAllStockItemCollection">
            <TYPE>Stock Item</TYPE>
            <FETCH>Name,GUID,AlterID,Parent,BaseUnits,ClosingBalance,ClosingRate,ClosingValue</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();
  }

  private getTallyCompanyName(): string {
    return this.configService.getOrThrow<string>('TALLY_COMPANY_NAME').trim();
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
