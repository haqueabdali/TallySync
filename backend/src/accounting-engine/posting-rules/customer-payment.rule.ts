import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { CustomerPaymentEntity } from '../../customer-payments/entities/customer-payment.entity';
import { CustomerPaymentMethod } from '../../customer-payments/enums/customer-payment-method.enum';
import { CustomerPaymentStatus } from '../../customer-payments/enums/customer-payment-status.enum';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

@Injectable()
export class CustomerPaymentPostingRule
  implements PostingRule<CustomerPaymentEntity>
{
  constructor(
    @InjectRepository(CustomerPaymentEntity)
    private readonly paymentRepository: Repository<CustomerPaymentEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository: Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<CustomerPaymentEntity> {
    const payment = await this.paymentRepository.findOne({
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
        'Customer payment not found.',
      );
    }

    return payment;
  }

  async build(
    payment: CustomerPaymentEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (payment.companyId !== companyId) {
      throw new NotFoundException(
        'Customer payment not found.',
      );
    }

    if (payment.status !== CustomerPaymentStatus.POSTED) {
      throw new ConflictException(
        'Only posted customer payments can create accounting entries.',
      );
    }

    const settings = await this.getSettings(companyId);

    const receivingAccountId =
      this.resolveReceivingAccount(payment, settings);

    const accountsReceivableAccountId =
      this.requireAccount(
        settings.accountsReceivableAccountId,
        'Accounts Receivable',
      );

    const allocatedAmount = this.round(
      Number(payment.allocatedAmount),
    );

    if (allocatedAmount <= 0) {
      throw new ConflictException(
        'Customer payment has no allocated amount to post.',
      );
    }

    return {
      companyId,
      sourceType: JournalEntrySourceType.CUSTOMER_PAYMENT,
      sourceId: payment.id,
      entryDate: payment.paymentDate,
      referenceNumber:
        payment.referenceNumber ?? payment.paymentNumber,
      currency: payment.currency,
      narration: `Automatic posting for customer payment ${payment.paymentNumber}`,
      lines: [
        {
          accountId: receivingAccountId,
          debit: allocatedAmount,
          credit: 0,
          description: `Receipt from customer for payment ${payment.paymentNumber}`,
          partyType: 'customer',
          partyId: payment.customerId,
          costCenter: null,
        },
        {
          accountId: accountsReceivableAccountId,
          debit: 0,
          credit: allocatedAmount,
          description: `Settlement of accounts receivable for payment ${payment.paymentNumber}`,
          partyType: 'customer',
          partyId: payment.customerId,
          costCenter: null,
        },
      ],
    };
  }

  private resolveReceivingAccount(
    payment: CustomerPaymentEntity,
    settings: AccountingSettingsEntity,
  ): string {
    switch (payment.paymentMethod) {
      case CustomerPaymentMethod.CASH:
        return this.requireAccount(
          settings.cashAccountId,
          'Cash',
        );

      case CustomerPaymentMethod.CARD:
        return this.requireAccount(
          settings.cardClearingAccountId ??
            settings.bankAccountId,
          'Card Clearing or Bank',
        );

      case CustomerPaymentMethod.BANK_TRANSFER:
      case CustomerPaymentMethod.CHEQUE:
      case CustomerPaymentMethod.OTHER:
      default:
        return this.requireAccount(
          settings.bankAccountId,
          'Bank',
        );
    }
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

    if (!settings.autoPostCustomerPayments) {
      throw new ConflictException(
        'Automatic posting for customer payments is disabled.',
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
