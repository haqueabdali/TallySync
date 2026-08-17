import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { SalesInvoiceEntity } from '../../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceStatus } from '../../sales-invoices/enums/sales-invoice-status.enum';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

@Injectable()
export class SalesInvoicePostingRule
  implements PostingRule<SalesInvoiceEntity>
{
  constructor(
    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository: Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<SalesInvoiceEntity> {
    const invoice = await this.salesInvoiceRepository.findOne({
      where: {
        id: sourceId,
        companyId,
      },
      relations: {
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Sales invoice not found.');
    }

    return invoice;
  }

  async build(
    invoice: SalesInvoiceEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (invoice.companyId !== companyId) {
      throw new NotFoundException('Sales invoice not found.');
    }

    if (
      invoice.status === SalesInvoiceStatus.DRAFT ||
      invoice.status === SalesInvoiceStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Only posted sales invoices can create accounting entries.',
      );
    }

    const settings = await this.getSettings(companyId);

    const accountsReceivableAccountId =
      this.requireAccount(
        settings.accountsReceivableAccountId,
        'Accounts Receivable',
      );

    const salesRevenueAccountId = this.requireAccount(
      settings.salesRevenueAccountId,
      'Sales Revenue',
    );

    const totalReceivable = this.round(
      Number(invoice.grandTotal),
    );

    const revenueAmount = this.round(
      Number(invoice.subtotal) -
        Number(invoice.discountTotal) +
        Number(invoice.shippingTotal),
    );

    const taxAmount = this.round(
      Number(invoice.taxTotal),
    );

    const lines = [
      {
        accountId: accountsReceivableAccountId,
        debit: totalReceivable,
        credit: 0,
        description: `Accounts receivable for invoice ${invoice.invoiceNumber}`,
        partyType: 'customer',
        partyId: invoice.customerId,
        costCenter: null,
      },
      {
        accountId: salesRevenueAccountId,
        debit: 0,
        credit: revenueAmount,
        description: `Sales revenue for invoice ${invoice.invoiceNumber}`,
        partyType: null,
        partyId: null,
        costCenter: null,
      },
    ];

    if (taxAmount > 0) {
      lines.push({
        accountId: this.requireAccount(
          settings.outputTaxAccountId,
          'Output Tax',
        ),
        debit: 0,
        credit: taxAmount,
        description: `Output tax for invoice ${invoice.invoiceNumber}`,
        partyType: null,
        partyId: null,
        costCenter: null,
      });
    }

    return {
      companyId,
      sourceType: JournalEntrySourceType.SALES_INVOICE,
      sourceId: invoice.id,
      entryDate: invoice.invoiceDate,
      referenceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      narration: `Automatic posting for sales invoice ${invoice.invoiceNumber}`,
      lines,
    };
  }

  private async getSettings(
    companyId: string,
  ): Promise<AccountingSettingsEntity> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    return settings;
  }

  private requireAccount(
    accountId: string | null,
    label: string,
  ): string {
    if (!accountId) {
      throw new ConflictException(
        `${label} account is not configured.`,
      );
    }

    return accountId;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
