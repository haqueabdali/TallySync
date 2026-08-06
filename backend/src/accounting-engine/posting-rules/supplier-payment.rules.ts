import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { SupplierPayment } from '../../supplier-payments/entities/supplier-payment.entity';
import { SupplierPaymentMethod } from '../../supplier-payments/enums/supplier-payment-method.enum';
import { SupplierPaymentStatus } from '../../supplier-payments/enums/supplier-payment-status.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

@Injectable()
export class SupplierPaymentPostingRule
  implements PostingRule<SupplierPayment>
{
  constructor(
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentRepository: Repository<SupplierPayment>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository: Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<SupplierPayment> {
    const payment =
      await this.supplierPaymentRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          allocations: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Supplier payment not found.',
      );
    }

    return payment;
  }

  async build(
    payment: SupplierPayment,
    companyId: string,
  ): Promise<PostingDocument> {
    if (payment.companyId !== companyId) {
      throw new NotFoundException(
        'Supplier payment not found.',
      );
    }

    if (payment.status !== SupplierPaymentStatus.Posted) {
      throw new ConflictException(
        'Only posted supplier payments can create accounting entries.',
      );
    }

    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    const accountsPayableAccountId =
      this.requireAccount(
        settings.accountsPayableAccountId,
        'Accounts Payable',
      );

    const paymentAccountId =
      this.resolvePaymentAccount(payment, settings);

    const amount = this.round(Number(payment.amount));

    if (amount <= 0) {
      throw new ConflictException(
        'Supplier payment amount must be greater than zero.',
      );
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.SUPPLIER_PAYMENT,
      sourceId: payment.id,
      entryDate: payment.paymentDate,
      referenceNumber:
        payment.referenceNumber ??
        payment.paymentNumber,
      currency: payment.currency,
      narration:
        `Automatic posting for supplier payment ${payment.paymentNumber}`,
      lines: [
        {
          accountId: accountsPayableAccountId,
          debit: amount,
          credit: 0,
          description:
            `Accounts payable settlement for ${payment.paymentNumber}`,
          partyType: 'supplier',
          partyId: payment.supplierId,
          costCenter: null,
        },
        {
          accountId: paymentAccountId,
          debit: 0,
          credit: amount,
          description:
            `Payment issued for ${payment.paymentNumber}`,
          partyType: 'supplier',
          partyId: payment.supplierId,
          costCenter: null,
        },
      ],
    };
  }

  private resolvePaymentAccount(
    payment: SupplierPayment,
    settings: AccountingSettingsEntity,
  ): string {
    switch (payment.paymentMethod) {
      case SupplierPaymentMethod.Cash:
        return this.requireAccount(
          settings.cashAccountId,
          'Cash',
        );

      case SupplierPaymentMethod.Card:
        return this.requireAccount(
          settings.cardClearingAccountId ??
            settings.bankAccountId,
          'Card Clearing or Bank',
        );

      default:
        return this.requireAccount(
          settings.bankAccountId,
          'Bank',
        );
    }
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
    return Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100;
  }
}