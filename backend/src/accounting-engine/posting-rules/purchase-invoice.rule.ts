import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PurchaseInvoiceEntity } from '../../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../../purchase-invoices/enums/purchase-invoice-status.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

type PurchaseAccountingSettings = AccountingSettingsEntity & {
  accountsPayableAccountId?: string | null;
  inputTaxAccountId?: string | null;
  grniAccountId?: string | null;
  purchaseExpenseAccountId?: string | null;
  inventoryAccountId?: string | null;
};

@Injectable()
export class PurchaseInvoicePostingRule
  implements PostingRule<PurchaseInvoiceEntity>
{
  constructor(
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository:
      Repository<PurchaseInvoiceEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<PurchaseInvoiceEntity> {
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: { id: sourceId, companyId },
      relations: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found.');
    }

    return invoice;
  }

  async build(
    invoice: PurchaseInvoiceEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (invoice.companyId !== companyId) {
      throw new NotFoundException('Purchase invoice not found.');
    }

    if (
      invoice.status !== PurchaseInvoiceStatus.Posted &&
      invoice.status !== PurchaseInvoiceStatus.PartiallyPaid &&
      invoice.status !== PurchaseInvoiceStatus.Paid
    ) {
      throw new ConflictException(
        'Only posted purchase invoices can create accounting entries.',
      );
    }

    const settings = (await this.settingsRepository.findOne({
      where: { companyId },
    })) as PurchaseAccountingSettings | null;

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    const accountsPayableAccountId = this.requireAccount(
      settings.accountsPayableAccountId,
      'Accounts Payable',
    );

    const purchaseDebitAccountId = this.resolvePurchaseDebitAccount(
      invoice,
      settings,
    );

    const subtotalAfterDiscount = this.round(
      Number(invoice.subtotal) - Number(invoice.discountTotal),
    );
    const shippingTotal = this.round(Number(invoice.shippingTotal ?? 0));
    const taxTotal = this.round(Number(invoice.taxTotal));
    const grandTotal = this.round(Number(invoice.grandTotal));
    const purchaseDebitAmount = this.round(
      subtotalAfterDiscount + shippingTotal,
    );

    if (grandTotal <= 0 || purchaseDebitAmount < 0 || taxTotal < 0) {
      throw new ConflictException(
        'Purchase invoice contains invalid accounting totals.',
      );
    }

    if (
      Math.abs(
        this.round(purchaseDebitAmount + taxTotal) - grandTotal,
      ) > 0.009
    ) {
      throw new ConflictException(
        'Purchase invoice totals are not balanced.',
      );
    }

    const lines: PostingDocument['lines'] = [
      {
        accountId: purchaseDebitAccountId,
        debit: purchaseDebitAmount,
        credit: 0,
        description: `Purchase value for invoice ${invoice.invoiceNumber}`,
        partyType: null,
        partyId: null,
        costCenter: null,
      },
    ];

    if (taxTotal > 0) {
      lines.push({
        accountId: this.requireAccount(
          settings.inputTaxAccountId,
          'Input Tax',
        ),
        debit: taxTotal,
        credit: 0,
        description: `Input tax for purchase invoice ${invoice.invoiceNumber}`,
        partyType: null,
        partyId: null,
        costCenter: null,
      });
    }

    lines.push({
      accountId: accountsPayableAccountId,
      debit: 0,
      credit: grandTotal,
      description: `Accounts payable for purchase invoice ${invoice.invoiceNumber}`,
      partyType: 'supplier',
      partyId: invoice.supplierId,
      costCenter: null,
    });

    return {
      companyId,
      sourceType: JournalEntrySourceType.PURCHASE_INVOICE,
      sourceId: invoice.id,
      entryDate: invoice.invoiceDate,
      referenceNumber:
        invoice.supplierInvoiceNumber ?? invoice.invoiceNumber,
      currency: invoice.currency,
      narration:
        `Automatic posting for purchase invoice ${invoice.invoiceNumber}`,
      lines,
    };
  }

  private resolvePurchaseDebitAccount(
    invoice: PurchaseInvoiceEntity,
    settings: PurchaseAccountingSettings,
  ): string {
    if (invoice.goodsReceiptId) {
      return this.requireAccount(
        settings.grniAccountId ?? settings.inventoryAccountId,
        'GRNI or Inventory',
      );
    }

    return this.requireAccount(
      settings.purchaseExpenseAccountId ?? settings.inventoryAccountId,
      'Purchase Expense or Inventory',
    );
  }

  private requireAccount(
    accountId: string | null | undefined,
    label: string,
  ): string {
    if (!accountId) {
      throw new ConflictException(`${label} account is not configured.`);
    }
    return accountId;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
