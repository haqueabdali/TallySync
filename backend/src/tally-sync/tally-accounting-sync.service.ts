import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { CustomerPaymentStatus } from '../customer-payments/enums/customer-payment-status.enum';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceStatus } from '../sales-invoices/enums/sales-invoice-status.enum';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { SupplierPaymentStatus } from '../supplier-payments/enums/supplier-payment-status.enum';
import { TallyAccountingSyncEntity } from './entities/tally-accounting-sync.entity';
import { TallyHttpService } from './tally-http.service';
import { TallyMasterService } from './tally-master.service';
import { TallyParserService, TallyVoucherImportResult } from './tally-parser.service';
import { TallyXmlService } from './tally-xml.service';

type SourceType =
  | 'sales_invoice'
  | 'customer_payment'
  | 'purchase_invoice'
  | 'supplier_payment';

type VoucherType = 'Sales' | 'Receipt' | 'Purchase' | 'Payment';

type SyncResult = {
  success: boolean;
  alreadySynced: boolean;
  sourceType: SourceType;
  sourceId: string;
  voucherType: VoucherType;
  voucherNumber: string;
  tallyVoucherId: string | null;
  tallyGuid: string | null;
  tally?: TallyVoucherImportResult;
};

@Injectable()
export class TallyAccountingSyncService {
  constructor(
    @InjectRepository(TallyAccountingSyncEntity)
    private readonly trackingRepository: Repository<TallyAccountingSyncEntity>,
    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,
    @InjectRepository(CustomerPaymentEntity)
    private readonly customerPaymentRepository: Repository<CustomerPaymentEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentRepository: Repository<SupplierPayment>,
    private readonly tallyMasterService: TallyMasterService,
    private readonly tallyXmlService: TallyXmlService,
    private readonly tallyHttpService: TallyHttpService,
    private readonly tallyParserService: TallyParserService,
    private readonly configService: ConfigService,
  ) {}

  async syncSalesInvoice(id: string, companyId: string): Promise<SyncResult> {
    const invoice = await this.salesInvoiceRepository.findOne({
      where: { id, companyId },
      relations: { customer: true, items: { item: true } },
    });
    if (!invoice) throw new NotFoundException('Sales invoice not found');
    if (![SalesInvoiceStatus.POSTED, SalesInvoiceStatus.PARTIALLY_PAID, SalesInvoiceStatus.PAID].includes(invoice.status)) {
      throw new BadRequestException(`Only posted sales invoices can be synchronized. Current status: ${invoice.status}`);
    }
    if (!invoice.customer) throw new BadRequestException('Sales invoice customer is missing');
    if (!invoice.items?.length) throw new BadRequestException('Sales invoice has no items');

    const customerLedger = invoice.customer.tallyLedgerName?.trim() || invoice.customer.name?.trim();
    if (!customerLedger) throw new BadRequestException('Customer does not have a valid Tally ledger name');
    const salesLedger = this.configService.get<string>('TALLY_SALES_LEDGER_NAME', 'Sales').trim();
    const defaultUnit = this.configService.get<string>('TALLY_DEFAULT_UNIT', 'Nos').trim();
    const defaultGodown = this.configService.get<string>('TALLY_DEFAULT_GODOWN', 'Main Location').trim();
    const defaultStockGroup = this.configService.get<string>('TALLY_DEFAULT_STOCK_GROUP', 'Primary').trim();

    await this.tallyMasterService.ensureLedgerMasters([
      { name: customerLedger, parent: 'Sundry Debtors', isBillWise: true },
      { name: salesLedger, parent: 'Sales Accounts', isBillWise: false },
    ]);
    await this.tallyMasterService.ensureStockItemMasters(invoice.items.map((line) => ({
      name: line.item?.tallyItemName?.trim() || line.item?.name?.trim() || line.itemName?.trim() || '',
      parent: defaultStockGroup,
      baseUnit: this.toTallyUnit(line.item?.unit, line.unit, defaultUnit),
    })));

    const preview = this.tallyXmlService.buildSalesVoucher({
      voucherNumber: invoice.invoiceNumber,
      voucherDate: invoice.invoiceDate,
      customerLedgerName: customerLedger,
      salesLedgerName: salesLedger,
      items: invoice.items.map((line) => {
        const stockItemName = line.item?.tallyItemName?.trim() || line.item?.name?.trim() || line.itemName?.trim();
        if (!stockItemName) throw new BadRequestException('Sales invoice contains an item without a Tally item name');
        return {
          stockItemName,
          quantity: Number(line.quantity),
          rate: Number(line.lineTotal) / Number(line.quantity),
          unit: this.toTallyUnit(line.item?.unit, line.unit, defaultUnit),
          godownName: defaultGodown,
        };
      }),
    });

    return this.syncVoucher('sales_invoice', invoice.id, companyId, 'Sales', invoice.invoiceNumber, preview.xml);
  }

  async syncCustomerPayment(id: string, companyId: string): Promise<SyncResult> {
    const payment = await this.customerPaymentRepository.findOne({
      where: { id, companyId },
      relations: { customer: true, allocations: { salesInvoice: true } },
    });
    if (!payment) throw new NotFoundException('Customer payment not found');
    if (payment.status !== CustomerPaymentStatus.POSTED) {
      throw new BadRequestException(`Only posted customer payments can be synchronized. Current status: ${payment.status}`);
    }
    const partyLedger = payment.customer?.tallyLedgerName?.trim() || payment.customer?.name?.trim();
    if (!partyLedger) throw new BadRequestException('Customer does not have a valid Tally ledger name');
    const moneyLedger = this.moneyLedgerName(String(payment.paymentMethod), payment.bankAccountName);

    await this.tallyMasterService.ensureLedgerMasters([
      { name: partyLedger, parent: 'Sundry Debtors', isBillWise: true },
      { name: moneyLedger, parent: this.moneyLedgerParent(String(payment.paymentMethod)), isBillWise: false },
    ]);

    const preview = this.tallyXmlService.buildLedgerPaymentVoucher({
      voucherType: 'Receipt',
      voucherNumber: payment.paymentNumber,
      voucherDate: payment.paymentDate,
      partyLedgerName: partyLedger,
      moneyLedgerName: moneyLedger,
      amount: Number(payment.amount),
      billReferences: payment.allocations.map((allocation) => ({
        name: allocation.salesInvoice?.invoiceNumber || allocation.salesInvoiceId,
        amount: Number(allocation.allocatedAmount),
      })),
    });

    return this.syncVoucher('customer_payment', payment.id, companyId, 'Receipt', payment.paymentNumber, preview.xml);
  }

  async syncPurchaseInvoice(id: string, companyId: string): Promise<SyncResult> {
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: { id, companyId },
      relations: { supplier: true, items: { item: true } },
    });
    if (!invoice) throw new NotFoundException('Purchase invoice not found');
    if (![PurchaseInvoiceStatus.Posted, PurchaseInvoiceStatus.PartiallyPaid, PurchaseInvoiceStatus.Paid].includes(invoice.status)) {
      throw new BadRequestException(`Only posted purchase invoices can be synchronized. Current status: ${invoice.status}`);
    }
    const supplierLedger = invoice.supplier?.name?.trim();
    if (!supplierLedger) throw new BadRequestException('Purchase invoice supplier is missing');
    const purchaseLedger = this.configService.get<string>('TALLY_PURCHASE_LEDGER_NAME', 'Purchase').trim();
    const defaultUnit = this.configService.get<string>('TALLY_DEFAULT_UNIT', 'Nos').trim();
    const defaultGodown = this.configService.get<string>('TALLY_DEFAULT_GODOWN', 'Main Location').trim();
    const defaultStockGroup = this.configService.get<string>('TALLY_DEFAULT_STOCK_GROUP', 'Primary').trim();

    await this.tallyMasterService.ensureLedgerMasters([
      { name: supplierLedger, parent: 'Sundry Creditors', isBillWise: true },
      { name: purchaseLedger, parent: 'Purchase Accounts', isBillWise: false },
    ]);
    await this.tallyMasterService.ensureStockItemMasters(invoice.items.map((line) => ({
      name: line.item?.tallyItemName?.trim() || line.item?.name?.trim() || line.itemName?.trim() || '',
      parent: defaultStockGroup,
      baseUnit: this.toTallyUnit(line.item?.unit, line.unit, defaultUnit),
    })));

    const preview = this.tallyXmlService.buildPurchaseVoucher({
      voucherNumber: invoice.invoiceNumber,
      voucherDate: invoice.invoiceDate,
      supplierLedgerName: supplierLedger,
      purchaseLedgerName: purchaseLedger,
      items: invoice.items.map((line) => {
        const stockItemName = line.item?.tallyItemName?.trim() || line.item?.name?.trim() || line.itemName?.trim();
        if (!stockItemName) throw new BadRequestException('Purchase invoice contains an item without a Tally item name');
        return {
          stockItemName,
          quantity: Number(line.quantity),
          rate: Number(line.lineTotal) / Number(line.quantity),
          unit: this.toTallyUnit(line.item?.unit, line.unit, defaultUnit),
          godownName: defaultGodown,
        };
      }),
    });

    return this.syncVoucher('purchase_invoice', invoice.id, companyId, 'Purchase', invoice.invoiceNumber, preview.xml);
  }

  async syncSupplierPayment(id: string, companyId: string): Promise<SyncResult> {
    const payment = await this.supplierPaymentRepository.findOne({
      where: { id, companyId },
      relations: { supplier: true, allocations: { purchaseInvoice: true } },
    });
    if (!payment) throw new NotFoundException('Supplier payment not found');
    if (payment.status !== SupplierPaymentStatus.Posted) {
      throw new BadRequestException(`Only posted supplier payments can be synchronized. Current status: ${payment.status}`);
    }
    const partyLedger = payment.supplier?.name?.trim();
    if (!partyLedger) throw new BadRequestException('Supplier payment supplier is missing');
    const moneyLedger = this.moneyLedgerName(String(payment.paymentMethod), payment.bankAccountName);

    await this.tallyMasterService.ensureLedgerMasters([
      { name: partyLedger, parent: 'Sundry Creditors', isBillWise: true },
      { name: moneyLedger, parent: this.moneyLedgerParent(String(payment.paymentMethod)), isBillWise: false },
    ]);

    const preview = this.tallyXmlService.buildLedgerPaymentVoucher({
      voucherType: 'Payment',
      voucherNumber: payment.paymentNumber,
      voucherDate: payment.paymentDate,
      partyLedgerName: partyLedger,
      moneyLedgerName: moneyLedger,
      amount: Number(payment.amount),
      billReferences: payment.allocations.map((allocation) => ({
        name: allocation.purchaseInvoice?.invoiceNumber || allocation.purchaseInvoiceId,
        amount: Number(allocation.allocatedAmount),
      })),
    });

    return this.syncVoucher('supplier_payment', payment.id, companyId, 'Payment', payment.paymentNumber, preview.xml);
  }

  private async syncVoucher(
    sourceType: SourceType,
    sourceId: string,
    companyId: string,
    voucherType: VoucherType,
    voucherNumber: string,
    xml: string,
  ): Promise<SyncResult> {
    let tracking = await this.trackingRepository.findOne({ where: { companyId, sourceType, sourceId } });
    if (tracking?.status === 'synced') return this.trackingResult(tracking, true);

    const lookupXml = this.tallyXmlService.buildVoucherLookup(voucherType, voucherNumber);
    let lookupResponse: string;
    try {
      lookupResponse = await this.tallyHttpService.postXml(lookupXml, 20_000);
    } catch (error: unknown) {
      throw new ServiceUnavailableException(`Tally voucher lookup failed; creation was not attempted: ${this.errorMessage(error)}`);
    }
    if (!this.tallyParserService.isEnvelopeResponse(lookupResponse)) {
      throw new BadGatewayException('Tally voucher lookup returned an invalid response; creation was not attempted');
    }

    const existing = this.tallyParserService.parseVoucherLookup(lookupResponse, voucherNumber, voucherType);
    if (!tracking) {
      tracking = this.trackingRepository.create({
        companyId, sourceType, sourceId, voucherType, voucherNumber,
        tallyVoucherId: null, tallyGuid: null, status: 'pending', syncAttempts: 0,
        lastError: null, syncedAt: null,
      });
    }

    if (existing.found) {
      tracking.status = 'synced';
      tracking.tallyVoucherId = existing.masterId;
      tracking.tallyGuid = existing.guid;
      tracking.lastError = null;
      tracking.syncedAt = new Date();
      await this.trackingRepository.save(tracking);
      return this.trackingResult(tracking, true);
    }

    tracking.status = 'syncing';
    tracking.syncAttempts += 1;
    tracking.lastError = null;
    tracking = await this.trackingRepository.save(tracking);

    let responseText = '';
    try {
      responseText = await this.tallyHttpService.postXml(xml, 20_000);
      const result = this.tallyParserService.parseVoucherImportResponse(responseText);
      if (!result.success) {
        throw new BadGatewayException(result.lineError || this.tallyParserService.buildVoucherFailureMessage(result));
      }

      tracking.status = 'synced';
      tracking.tallyVoucherId = result.lastVoucherId > 0 ? String(result.lastVoucherId) : null;
      tracking.lastError = null;
      tracking.syncedAt = new Date();
      await this.trackingRepository.save(tracking);

      return { ...this.trackingResult(tracking, false), tally: result };
    } catch (error: unknown) {
      tracking.status = 'failed';
      tracking.lastError = this.errorMessage(error).slice(0, 4000);
      await this.trackingRepository.save(tracking);
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException(
        `Tally ${voucherType} voucher synchronization failed. Do not retry blindly; run the same endpoint again so read-before-create can reconcile first: ${this.errorMessage(error)}`,
      );
    }
  }

  private trackingResult(tracking: TallyAccountingSyncEntity, alreadySynced: boolean): SyncResult {
    return {
      success: true,
      alreadySynced,
      sourceType: tracking.sourceType as SourceType,
      sourceId: tracking.sourceId,
      voucherType: tracking.voucherType as VoucherType,
      voucherNumber: tracking.voucherNumber,
      tallyVoucherId: tracking.tallyVoucherId,
      tallyGuid: tracking.tallyGuid,
    };
  }

  private moneyLedgerName(method: string, explicitName: string | null): string {
    if (explicitName?.trim()) return explicitName.trim();
    if (method.toLowerCase().includes('cash')) {
      return this.configService.get<string>('TALLY_CASH_LEDGER_NAME', 'Cash').trim();
    }
    return this.configService.get<string>('TALLY_BANK_LEDGER_NAME', 'Bank').trim();
  }

  private moneyLedgerParent(method: string): string {
    return method.toLowerCase().includes('cash') ? 'Cash-in-Hand' : 'Bank Accounts';
  }

  private toTallyUnit(itemUnit: string | null | undefined, lineUnit: string | null | undefined, fallback: string): string {
    const unit = itemUnit?.trim() || lineUnit?.trim() || fallback.trim();
    return unit.toUpperCase() === 'PCS' ? 'pcs' : unit;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
  }
}
