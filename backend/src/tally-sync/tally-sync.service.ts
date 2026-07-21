import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TallyMasterService } from './tally-master.service';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { PreviewSalesVoucherDto } from './dto/preview-sales-voucher.dto';

type TallyBaseImportResult = {
  success: boolean;
  created: number;
  altered: number;
  ignored: number;
  errors: number;
  exceptions: number;
  lineError: string | null;
};

type TallyImportResult = TallyBaseImportResult & {
  lastVoucherId: number;
  voucherNumber: string | null;
};

type TallyMasterResult = TallyBaseImportResult & {
  masterType: string;
  masterName: string;
};

type TallyLedgerDefinition = {
  name: string;
  parent: string;
  isBillWise: boolean;
};

type TallyStockItemDefinition = {
  name: string;
  parent: string;
  baseUnit: string;
};

@Injectable()
export class TallySyncService {
  constructor(
    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,
    private readonly tallyMasterService: TallyMasterService,
    private readonly configService: ConfigService,
  ) {}

  async checkTallyConnection(): Promise<{
    connected: boolean;
    tallyUrl: string;
    tallyCompanyName: string;
    responsePreview: string;
  }> {
    const tallyUrl = this.getTallyUrl();
    const tallyCompanyName = this.getTallyCompanyName();

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
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();

    try {
      const responseText = await this.postXmlToTally(
        requestXml,
        10_000,
      );

      /*
       * Tally export responses do not always contain a STATUS element.
       * A non-empty XML envelope is sufficient to confirm connectivity.
       */
      if (!/<ENVELOPE(?:\s|>)/i.test(responseText)) {
        throw new Error(
          `Unexpected response from Tally: ${responseText.substring(0, 2_000)}`,
        );
      }

      return {
        connected: true,
        tallyUrl,
        tallyCompanyName,
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

  async findPendingSalesOrders(): Promise<{
    count: number;
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      syncStatus: string;
    }>;
  }> {
    const orders = await this.salesOrderRepository
      .createQueryBuilder('salesOrder')
      .where('salesOrder.status = :status', {
        status: 'fulfilled',
      })
      .andWhere(
  'salesOrder.syncStatus IN (:...syncStatuses)',
  {
    syncStatuses: ['pending', 'failed'],
  },
)
      .andWhere('salesOrder.deletedAt IS NULL')
      .orderBy('salesOrder.createdAt', 'ASC')
      .getMany();

    return {
      count: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: String(order.status),
        syncStatus: String(order.syncStatus),
      })),
    };
  }

  previewSalesVoucher(dto: PreviewSalesVoucherDto): {
    voucherNumber: string;
    voucherDate: string;
    totalAmount: number;
    itemCount: number;
    xml: string;
  } {
    this.validateVoucherDto(dto);

    const tallyCompanyName = this.getTallyCompanyName();
    const voucherDate = this.formatTallyDate(dto.voucherDate);

    const totalAmount = dto.items.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.rate);
    }, 0);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException(
        'Sales voucher total must be greater than zero',
      );
    }

    const total = this.formatMoney(totalAmount);

    const inventoryEntries = dto.items
      .map((item) => {
        const stockItemName = item.stockItemName?.trim();
        const unit = item.unit?.trim();

        const godownName =
        item.godownName?.trim() ||
        this.configService
          .get<string>('TALLY_DEFAULT_GODOWN', 'Main Location')
          .trim();

        if (!stockItemName) {
          throw new BadRequestException(
            'Stock item name is required',
          );
        }

        if (!unit) {
          throw new BadRequestException(
            `Unit is required for stock item "${stockItemName}"`,
          );
        }

        const quantityValue = Number(item.quantity);
        const rateValue = Number(item.rate);
        const itemAmount = quantityValue * rateValue;

        if (
          !Number.isFinite(quantityValue) ||
          quantityValue <= 0
        ) {
          throw new BadRequestException(
            `Invalid quantity for "${stockItemName}"`,
          );
        }

        if (!Number.isFinite(rateValue) || rateValue <= 0) {
          throw new BadRequestException(
            `Invalid rate for "${stockItemName}"`,
          );
        }

        if (!Number.isFinite(itemAmount) || itemAmount <= 0) {
          throw new BadRequestException(
            `Invalid amount for "${stockItemName}"`,
          );
        }

        const quantity = this.formatNumber(quantityValue);
        const rate = this.formatMoney(rateValue);
        const amount = this.formatMoney(itemAmount);

        return `
<ALLINVENTORYENTRIES.LIST>
  <STOCKITEMNAME>${this.escapeXml(stockItemName)}</STOCKITEMNAME>
  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>

  <RATE>${rate}/${this.escapeXml(unit)}</RATE>
  <AMOUNT>${amount}</AMOUNT>
  <ACTUALQTY>${quantity} ${this.escapeXml(unit)}</ACTUALQTY>
  <BILLEDQTY>${quantity} ${this.escapeXml(unit)}</BILLEDQTY>

  <BATCHALLOCATIONS.LIST>
    <GODOWNNAME>${this.escapeXml(godownName)}</GODOWNNAME>
    <BATCHNAME>Primary Batch</BATCHNAME>
    <AMOUNT>${amount}</AMOUNT>
    <ACTUALQTY>${quantity} ${this.escapeXml(unit)}</ACTUALQTY>
    <BILLEDQTY>${quantity} ${this.escapeXml(unit)}</BILLEDQTY>
  </BATCHALLOCATIONS.LIST>

  <ACCOUNTINGALLOCATIONS.LIST>
    <LEDGERNAME>${this.escapeXml(dto.salesLedgerName)}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>${amount}</AMOUNT>
  </ACCOUNTINGALLOCATIONS.LIST>
</ALLINVENTORYENTRIES.LIST>
`
          .replace(
            '<ISDEEMPOSITIVE>',
            '<ISDEEMEDPOSITIVE>',
          )
          .replace(
            '</ISDEEMPOSITIVE>',
            '</ISDEEMEDPOSITIVE>',
          )
          .trim();
      })
      .join('\n');
    
    const voucherNumber = this.escapeXml(dto.voucherNumber);
    const customerLedgerName = this.escapeXml(
      dto.customerLedgerName,
    );

    const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>

  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(
          tallyCompanyName,
        )}</SVCURRENTCOMPANY>

        <IMPORTDUPS>@@DUPCOMBINE</IMPORTDUPS>
      </STATICVARIABLES>
    </DESC>

    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER
          VCHTYPE="Sales"
          ACTION="Create"
          OBJVIEW="Invoice Voucher View"
        >
          <DATE>${voucherDate}</DATE>
          <EFFECTIVEDATE>${voucherDate}</EFFECTIVEDATE>

          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
          <REFERENCE>${voucherNumber}</REFERENCE>

          <PARTYLEDGERNAME>${customerLedgerName}</PARTYLEDGERNAME>

          <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
          <OBJVIEW>Invoice Voucher View</OBJVIEW>
          <ISINVOICE>Yes</ISINVOICE>

          <LEDGERENTRIES.LIST>
            <LEDGERNAME>${customerLedgerName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
            <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
            <AMOUNT>-${total}</AMOUNT>

            <BILLALLOCATIONS.LIST>
              <NAME>${voucherNumber}</NAME>
              <BILLTYPE>New Ref</BILLTYPE>
              <AMOUNT>-${total}</AMOUNT>
            </BILLALLOCATIONS.LIST>
          </LEDGERENTRIES.LIST>

          ${inventoryEntries}
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
    `.trim();

    return {
      voucherNumber: dto.voucherNumber,
      voucherDate,
      totalAmount,
      itemCount: dto.items.length,
      xml,
    };
  }

  async syncSalesOrder(id: string): Promise<{
    success: boolean;
    alreadySynced: boolean;
    orderId: string;
    orderNumber: string;
    syncStatus: string;
    tallyVoucherId: string | null;
    tallyVoucherNumber: string | null;
    tally?: TallyImportResult;
    responsePreview?: string;
  }> {
    const claimedOrder = await this.claimSalesOrderForSync(id);

    if (String(claimedOrder.syncStatus) === 'synced') {
      return {
        success: true,
        alreadySynced: true,
        orderId: claimedOrder.id,
        orderNumber: claimedOrder.orderNumber,
        syncStatus: String(claimedOrder.syncStatus),
        tallyVoucherId: claimedOrder.tallyVoucherId ?? null,
        tallyVoucherNumber:
          claimedOrder.tallyVoucherNumber ?? claimedOrder.orderNumber,
      };
    }

    let order: SalesOrderEntity | null = null;
    let responseText = '';

    try {
      order = await this.loadSalesOrderForTally(id);

      if (String(order.status) !== 'fulfilled') {
        throw new BadRequestException(
          `Only fulfilled sales orders can be synchronized. Current status: ${String(
            order.status,
          )}`,
        );
      }

      if (!order.customer) {
        throw new BadRequestException(
          'Sales order does not have a customer',
        );
      }

      if (!order.items?.length) {
        throw new BadRequestException(
          'Sales order does not contain any items',
        );
      }

      const salesLedgerName = this.configService
  .get<string>('TALLY_SALES_LEDGER_NAME', 'Sales')
  .trim();

const defaultUnit = this.configService
  .get<string>('TALLY_DEFAULT_UNIT', 'Nos')
  .trim();

const defaultGodown = this.configService
  .get<string>('TALLY_DEFAULT_GODOWN', 'Main Location')
  .trim();

const defaultStockGroup = this.configService
  .get<string>('TALLY_DEFAULT_STOCK_GROUP', 'Primary')
  .trim();

await this.tallyMasterService.ensureLedgerMasters([
  {
    name: order.customer.name,
    parent: 'Sundry Debtors',
    isBillWise: true,
  },
  {
    name: salesLedgerName,
    parent: 'Sales Accounts',
    isBillWise: false,
  },
]);

const stockItems: TallyStockItemDefinition[] = order.items.map(
  (orderItem) => {
    if (!orderItem.item) {
      throw new BadRequestException(
        'One or more sales-order items do not have an inventory item',
      );
    }

    const stockItemName =
      orderItem.item.tallyItemName?.trim() ||
      orderItem.item.name?.trim();

    if (!stockItemName) {
      throw new BadRequestException(
        'One or more inventory items do not have a valid Tally item name',
      );
    }

    return {
      name: stockItemName,
      parent: defaultStockGroup,
      baseUnit: defaultUnit,
    };
  },
);

await this.tallyMasterService.ensureStockItemMasters(stockItems);

const voucherDate = this.toIsoDate(order.orderDate);


await this.tallyMasterService.ensureLedgerMasters([
  {
    name: order.customer.name,
    parent: 'Sundry Debtors',
    isBillWise: true,
  },
  {
    name: salesLedgerName,
    parent: 'Sales Accounts',
    isBillWise: false,
  },
]);



await this.tallyMasterService.ensureStockItemMasters(stockItems);

      const voucher = this.previewSalesVoucher({
        voucherNumber: order.orderNumber,
        voucherDate,
        customerLedgerName: order.customer.name,
        salesLedgerName,
        items: order.items.map((orderItem) => {
          if (!orderItem.item) {
            throw new BadRequestException(
              'One or more sales-order items do not have an inventory item',
            );
          }

          return {
            stockItemName:
              orderItem.item.tallyItemName?.trim() ||
              orderItem.item.name,
            quantity: Number(orderItem.quantity),
            rate: Number(orderItem.unitPrice),
            unit: defaultUnit,
            godownName: defaultGodown,
          };
        }),
      });

      responseText = await this.postXmlToTally(
        voucher.xml,
        20_000,
      );

      const tallyResult =
        this.parseTallyImportResponse(responseText);

      if (!tallyResult.success) {
        const tallyError =
          tallyResult.lineError ??
          this.buildTallyFailureMessage(tallyResult);

        throw new BadGatewayException({
          message: tallyError,
          orderId: order.id,
          orderNumber: order.orderNumber,
          tally: tallyResult,
          responsePreview: responseText.substring(0, 2_000),
        });
      }

      await this.salesOrderRepository.update(
        { id: order.id },
        {
          syncStatus:
            'synced' as SalesOrderEntity['syncStatus'],
          lastSyncedAt: new Date(),
          tallyVoucherId:
            tallyResult.lastVoucherId > 0
              ? String(tallyResult.lastVoucherId)
              : null,
          tallyVoucherNumber:
            tallyResult.voucherNumber ?? order.orderNumber,
          tallySyncError: null,
        },
      );

      return {
        success: true,
        alreadySynced: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        syncStatus: 'synced',
        tallyVoucherId:
          tallyResult.lastVoucherId > 0
            ? String(tallyResult.lastVoucherId)
            : null,
        tallyVoucherNumber:
          tallyResult.voucherNumber ?? order.orderNumber,
        tally: tallyResult,
        responsePreview: responseText.substring(0, 2_000),
      };
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);

      try {
        await this.markOrderSyncFailed(
          order?.id ?? claimedOrder.id,
          message,
        );
      } catch {
        // Preserve the original synchronization error.
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException(
        `Failed to synchronize sales order ${
          order?.orderNumber ?? claimedOrder.orderNumber
        }: ${message}`,
      );
    }
  }

  /*private async ensureLedgerMasters(
    ledgers: TallyLedgerDefinition[],
  ): Promise<TallyMasterResult[]> {
    const results: TallyMasterResult[] = [];

    for (const ledger of ledgers) {
      const exists = await this.tallyLedgerExists(ledger.name);

      if (exists) {
        results.push({
          success: true,
          masterType: 'Ledger',
          masterName: ledger.name,
          created: 0,
          altered: 0,
          ignored: 0,
          errors: 0,
          exceptions: 0,
          lineError: null,
        });

        continue;
      }

      const result = await this.createTallyLedger(ledger);

      results.push(result);

      if (!result.success) {
        throw new BadGatewayException({
          message: `Unable to create Tally ledger "${ledger.name}"`,
          master: result,
        });
      }
    }

    return results;
  }*/

/*private async tallyLedgerExists(
    ledgerName: string,
  ): Promise<boolean> {
    const tallyCompanyName = this.getTallyCompanyName();
    const escapedLedgerName = this.escapeXml(ledgerName);

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
        <SVCURRENTCOMPANY>${this.escapeXml(
          tallyCompanyName,
        )}</SVCURRENTCOMPANY>

        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>

      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSLedgerCollection">
            <TYPE>Ledger</TYPE>
            <FETCH>Name</FETCH>
            <FILTER>TSLedgerNameFilter</FILTER>
          </COLLECTION>

          <SYSTEM
            TYPE="Formulae"
            NAME="TSLedgerNameFilter"
          >
            $Name = "${escapedLedgerName}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
    `.trim();

    const responseText = await this.postXmlToTally(
      requestXml,
      10_000,
    );

    const normalizedResponse = this.decodeXml(
      responseText,
    ).toLowerCase();

    return normalizedResponse.includes(
      ledgerName.trim().toLowerCase(),
    );
  }*/

/*  private async createTallyLedger(
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
        <SVCURRENTCOMPANY>${this.escapeXml(
          tallyCompanyName,
        )}</SVCURRENTCOMPANY>

        <IMPORTDUPS>@@DUPIGNORE</IMPORTDUPS>
      </STATICVARIABLES>
    </DESC>

    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER
          NAME="${this.escapeXml(ledger.name)}"
          ACTION="Create"
        >
          <NAME>${this.escapeXml(ledger.name)}</NAME>
          <PARENT>${this.escapeXml(ledger.parent)}</PARENT>

          <ISBILLWISEON>${
            ledger.isBillWise ? 'Yes' : 'No'
          }</ISBILLWISEON>

          <AFFECTSSTOCK>${
            ledger.parent === 'Sales Accounts'
              ? 'Yes'
              : 'No'
          }</AFFECTSSTOCK>
        </LEDGER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
    `.trim();

    const responseText = await this.postXmlToTally(
      requestXml,
      15_000,
    );

    const parsed =
  this.parseTallyMasterImportResponse(responseText);

    return {
      ...parsed,
      masterType: 'Ledger',
      masterName: ledger.name,
    };
  }*/

/*  private async ensureStockItemMasters(
  stockItems: TallyStockItemDefinition[],
): Promise<TallyMasterResult[]> {
  const results: TallyMasterResult[] = [];

  const uniqueStockItems = Array.from(
    new Map(
      stockItems.map((stockItem) => [
        stockItem.name.trim().toLowerCase(),
        stockItem,
      ]),
    ).values(),
  );

  for (const stockItem of uniqueStockItems) {
    const exists = await this.tallyStockItemExists(
      stockItem.name,
    );

    if (exists) {
      results.push({
        success: true,
        masterType: 'Stock Item',
        masterName: stockItem.name,
        created: 0,
        altered: 0,
        ignored: 0,
        errors: 0,
        exceptions: 0,
        lineError: null,
      });

      continue;
    }

    const result = await this.createTallyStockItem(
      stockItem,
    );

    results.push(result);

    if (!result.success) {
      throw new BadGatewayException({
        message: `Unable to create Tally stock item "${stockItem.name}"`,
        master: result,
      });
    }
  }

  return results;
}*/

/*private async tallyStockItemExists(
  stockItemName: string,
): Promise<boolean> {
  const tallyCompanyName = this.getTallyCompanyName();
  const escapedStockItemName =
    this.escapeXml(stockItemName);

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
        <SVCURRENTCOMPANY>${this.escapeXml(
          tallyCompanyName,
        )}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>

      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TSStockItemCollection">
            <TYPE>Stock Item</TYPE>
            <FETCH>Name</FETCH>
            <FILTER>TSStockItemNameFilter</FILTER>
          </COLLECTION>

          <SYSTEM
            TYPE="Formulae"
            NAME="TSStockItemNameFilter"
          >
            $Name = "${escapedStockItemName}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
  `.trim();

  const responseText = await this.postXmlToTally(
    requestXml,
    10_000,
  );

  const normalizedResponse = this.decodeXml(
    responseText,
  ).toLowerCase();

  return normalizedResponse.includes(
    stockItemName.trim().toLowerCase(),
  );
}*/



/*private parseTallyMasterImportResponse(
  responseXml: string,
): TallyBaseImportResult {
  const created = this.extractXmlNumber(
    responseXml,
    'CREATED',
  );

  const altered = this.extractXmlNumber(
    responseXml,
    'ALTERED',
  );

  const ignored = this.extractXmlNumber(
    responseXml,
    'IGNORED',
  );

  const errors = this.extractXmlNumber(
    responseXml,
    'ERRORS',
  );

  const exceptions = this.extractXmlNumber(
    responseXml,
    'EXCEPTIONS',
  );

  const lineError =
    this.extractXmlText(responseXml, 'LINEERROR') ??
    this.extractXmlText(responseXml, 'ERROR');

  const success =
    errors === 0 &&
    exceptions === 0 &&
    !lineError &&
    (created > 0 || altered > 0 || ignored > 0);

  return {
    success,
    created,
    altered,
    ignored,
    errors,
    exceptions,
    lineError,
  };
}*/

  private validateVoucherDto(
    dto: PreviewSalesVoucherDto,
  ): void {
    if (!dto.voucherNumber?.trim()) {
      throw new BadRequestException(
        'Voucher number is required',
      );
    }

    if (!dto.voucherDate?.trim()) {
      throw new BadRequestException(
        'Voucher date is required',
      );
    }

    if (!dto.customerLedgerName?.trim()) {
      throw new BadRequestException(
        'Customer ledger name is required',
      );
    }

    if (!dto.salesLedgerName?.trim()) {
      throw new BadRequestException(
        'Sales ledger name is required',
      );
    }

    if (!dto.items?.length) {
      throw new BadRequestException(
        'At least one sales voucher item is required',
      );
    }
  }

  private async claimSalesOrderForSync(
    id: string,
  ): Promise<SalesOrderEntity> {
    return this.salesOrderRepository.manager.transaction(
      async (manager) => {
        const repository =
          manager.getRepository(SalesOrderEntity);

        const order = await repository
          .createQueryBuilder('salesOrder')
          .setLock('pessimistic_write')
          .where('salesOrder.id = :id', { id })
          .andWhere('salesOrder.deletedAt IS NULL')
          .getOne();

        if (!order) {
          throw new NotFoundException(
            'Sales order not found',
          );
        }

        const syncStatus = String(order.syncStatus);

        if (syncStatus === 'synced') {
          return order;
        }

        if (syncStatus === 'syncing') {
          const staleAfterMilliseconds = 60 * 1_000;

          const databaseClockRows: Array<{
            now: Date | string;
          }> = await manager.query(
            'SELECT NOW() AS "now"',
          );

          const databaseNowValue =
            databaseClockRows[0]?.now;

          const databaseNowTime = new Date(
            String(databaseNowValue),
          ).getTime();

          const updatedAtTime =
            order.updatedAt instanceof Date
              ? order.updatedAt.getTime()
              : new Date(
                  String(order.updatedAt),
                ).getTime();

          const lockAgeMilliseconds =
            databaseNowTime - updatedAtTime;

          const isStale =
            !Number.isFinite(updatedAtTime) ||
            (Number.isFinite(databaseNowTime) &&
              lockAgeMilliseconds >=
                staleAfterMilliseconds);

          if (!isStale) {
            const retryAfterSeconds = Math.max(
              1,
              Math.ceil(
                (staleAfterMilliseconds -
                  lockAgeMilliseconds) /
                  1_000,
              ),
            );

            throw new ConflictException({
              message:
                'Sales order synchronization is already in progress',
              orderId: order.id,
              orderNumber: order.orderNumber,
              syncStatus,
              retryAfterSeconds,
            });
          }
        }

        order.syncStatus =
          'syncing' as SalesOrderEntity['syncStatus'];

        order.tallySyncAttempts =
          Number(order.tallySyncAttempts ?? 0) + 1;

        order.tallySyncError = null;

        return repository.save(order);
      },
    );
  }

  private async loadSalesOrderForTally(
    id: string,
  ): Promise<SalesOrderEntity> {
    const order = await this.salesOrderRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: {
          item: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Sales order not found',
      );
    }

    return order;
  }

  private async postXmlToTally(
  xml: string,
  timeoutMilliseconds = 20_000,
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
      throw new BadGatewayException(
        'Tally returned an empty response',
      );
    }

    return responseText;
  }

  private parseTallyImportResponse(
    responseXml: string,
  ): TallyImportResult {
    const created = this.extractXmlNumber(
      responseXml,
      'CREATED',
    );

    const altered = this.extractXmlNumber(
      responseXml,
      'ALTERED',
    );

    const ignored = this.extractXmlNumber(
      responseXml,
      'IGNORED',
    );

    const errors = this.extractXmlNumber(
      responseXml,
      'ERRORS',
    );

    const exceptions = this.extractXmlNumber(
      responseXml,
      'EXCEPTIONS',
    );

    const lastVoucherId = this.extractXmlNumber(
      responseXml,
      'LASTVCHID',
    );

    const voucherNumber = this.extractXmlText(
      responseXml,
      'VCHNUMBER',
    );

    const lineError =
      this.extractXmlText(responseXml, 'LINEERROR') ??
      this.extractXmlText(responseXml, 'ERROR');

    const success =
      errors === 0 &&
      exceptions === 0 &&
      !lineError &&
      created + altered > 0;

    return {
      success,
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

  private buildTallyFailureMessage(
    result: TallyImportResult,
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

  private extractXmlNumber(
    xml: string,
    tag: string,
  ): number {
    const value = this.extractXmlText(xml, tag);

    if (!value) {
      return 0;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractXmlText(
    xml: string,
    tag: string,
  ): string | null {
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

  private async markOrderSyncFailed(
    orderId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.salesOrderRepository.update(
      { id: orderId },
      {
        syncStatus:
          'failed' as SalesOrderEntity['syncStatus'],
        tallySyncError: errorMessage.substring(0, 10_000),
        lastSyncedAt: new Date(),
      },
    );
  }

  private getTallyUrl(): string {
    return this.configService
      .get<string>('TALLY_URL', 'http://localhost:9000')
      .trim();
  }

  private getTallyCompanyName(): string {
    const companyName =
      this.configService.getOrThrow<string>(
        'TALLY_COMPANY_NAME',
      );

    if (!companyName.trim()) {
      throw new BadRequestException(
        'TALLY_COMPANY_NAME must not be empty',
      );
    }

    return companyName.trim();
  }

  private toIsoDate(value: Date | string): string {
    const date =
      value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Sales order has an invalid order date',
      );
    }

    return date.toISOString().slice(0, 10);
  }

  private formatTallyDate(value: string): string {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid voucher date',
      );
    }

    const year = date.getUTCFullYear();
    const month = String(
      date.getUTCMonth() + 1,
    ).padStart(2, '0');

    const day = String(date.getUTCDate()).padStart(
      2,
      '0',
    );

    return `${year}${month}${day}`;
  }

  private formatMoney(value: number): string {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(
        'Invalid monetary value',
      );
    }

    return value.toFixed(2);
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(
        'Invalid numeric value',
      );
    }

    return Number.isInteger(value)
      ? String(value)
      : value
          .toFixed(4)
          .replace(/0+$/, '')
          .replace(/\.$/, '');
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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