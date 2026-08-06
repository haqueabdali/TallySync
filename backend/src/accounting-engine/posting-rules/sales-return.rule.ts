import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { SalesReturnEntity } from '../../sales-returns/entities/sales-return.entity';
import { SalesReturnStatus } from '../../sales-returns/enums/sales-return-status.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';
import { PostingLine } from '../interfaces/posting-line.interface';

@Injectable()
export class SalesReturnPostingRule
  implements PostingRule<SalesReturnEntity>
{
  constructor(
    @InjectRepository(SalesReturnEntity)
    private readonly salesReturnRepository: Repository<SalesReturnEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository: Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<SalesReturnEntity> {
    const salesReturn =
      await this.salesReturnRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          items: true,
        },
      });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found.');
    }

    return salesReturn;
  }

  async build(
    salesReturn: SalesReturnEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (salesReturn.companyId !== companyId) {
      throw new NotFoundException('Sales return not found.');
    }

    if (salesReturn.status !== SalesReturnStatus.POSTED) {
      throw new ConflictException(
        'Only posted sales returns can create accounting entries.',
      );
    }

    const settings = await this.getSettings(companyId);

    const salesReturnsAccountId = this.requireAccount(
      settings.salesReturnsAccountId,
      'Sales Returns',
    );

    const accountsReceivableAccountId =
      this.requireAccount(
        settings.accountsReceivableAccountId,
        'Accounts Receivable',
      );

    const returnAmount = this.round(
      Number(salesReturn.subtotal) -
        Number(salesReturn.discountTotal),
    );

    const taxAmount = this.round(
      Number(salesReturn.taxTotal),
    );

    const totalCredit = this.round(
      Number(salesReturn.grandTotal),
    );

    const lines: PostingLine[] = [
  {
    accountId: salesReturnsAccountId,
    debit: returnAmount,
    credit: 0,
    description: `Sales return ${salesReturn.returnNumber}`,
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
    debit: taxAmount,
    credit: 0,
    description: `Output tax reversal for sales return ${salesReturn.returnNumber}`,
    partyType: null,
    partyId: null,
    costCenter: null,
  });
}

lines.push({
  accountId: accountsReceivableAccountId,
  debit: 0,
  credit: totalCredit,
  description: `Accounts receivable reduction for sales return ${salesReturn.returnNumber}`,
  partyType: 'customer',
  partyId: salesReturn.customerId,
  costCenter: null,
});

    return {
      companyId,
      sourceType: JournalEntrySourceType.SALES_RETURN,
      sourceId: salesReturn.id,
      entryDate: salesReturn.returnDate,
      referenceNumber: salesReturn.returnNumber,
      currency: salesReturn.currency,
      narration: `Automatic posting for sales return ${salesReturn.returnNumber}`,
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

    if (!settings.autoPostSalesReturns) {
      throw new ConflictException(
        'Automatic posting for sales returns is disabled.',
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
