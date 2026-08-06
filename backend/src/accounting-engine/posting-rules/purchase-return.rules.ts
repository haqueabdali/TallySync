import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PurchaseReturn } from '../../purchase-returns/entities/purchase-return.entity';
import { PurchaseReturnStatus } from '../../purchase-returns/enums/purchase-return-status.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

type PurchaseReturnAccountingSettings =
  AccountingSettingsEntity & {
    accountsPayableAccountId?: string | null;
    inventoryAccountId?: string | null;
    purchaseReturnsAccountId?: string | null;
    inputTaxAccountId?: string | null;
  };

@Injectable()
export class PurchaseReturnPostingRule
  implements PostingRule<PurchaseReturn>
{
  constructor(
    @InjectRepository(PurchaseReturn)
    private readonly purchaseReturnRepository:
      Repository<PurchaseReturn>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<PurchaseReturn> {
    const purchaseReturn =
      await this.purchaseReturnRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          items: true,
        },
      });

    if (!purchaseReturn) {
      throw new NotFoundException(
        'Purchase return not found.',
      );
    }

    return purchaseReturn;
  }

  async build(
    purchaseReturn: PurchaseReturn,
    companyId: string,
  ): Promise<PostingDocument> {
    if (purchaseReturn.companyId !== companyId) {
      throw new NotFoundException(
        'Purchase return not found.',
      );
    }

    if (
      purchaseReturn.status !== PurchaseReturnStatus.Posted
    ) {
      throw new ConflictException(
        'Only posted purchase returns can create accounting entries.',
      );
    }

    if (!purchaseReturn.items?.length) {
      throw new ConflictException(
        'Purchase return must contain at least one item.',
      );
    }

    const settings =
      (await this.settingsRepository.findOne({
        where: { companyId },
      })) as PurchaseReturnAccountingSettings | null;

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

    const purchaseReturnCreditAccountId =
      this.requireAccount(
        settings.purchaseReturnsAccountId ??
          settings.inventoryAccountId,
        'Purchase Returns or Inventory',
      );

    const subtotalAfterDiscount = this.round(
      Number(purchaseReturn.subtotal) -
        Number(purchaseReturn.discountTotal),
    );

    const taxTotal = this.round(
      Number(purchaseReturn.taxTotal),
    );

    const grandTotal = this.round(
      Number(purchaseReturn.grandTotal),
    );

    if (
      subtotalAfterDiscount < 0 ||
      taxTotal < 0 ||
      grandTotal <= 0
    ) {
      throw new ConflictException(
        'Purchase return contains invalid accounting totals.',
      );
    }

    const expectedGrandTotal = this.round(
      subtotalAfterDiscount + taxTotal,
    );

    if (
      Math.abs(expectedGrandTotal - grandTotal) > 0.009
    ) {
      throw new ConflictException(
        'Purchase return totals are not balanced.',
      );
    }

    const lines: PostingDocument['lines'] = [
      {
        accountId: accountsPayableAccountId,
        debit: grandTotal,
        credit: 0,
        description:
          `Accounts payable reduction for purchase return ${purchaseReturn.returnNumber}`,
        partyType: 'supplier',
        partyId: purchaseReturn.supplierId,
        costCenter: null,
      },
      {
        accountId: purchaseReturnCreditAccountId,
        debit: 0,
        credit: subtotalAfterDiscount,
        description:
          `Inventory or purchase return value for ${purchaseReturn.returnNumber}`,
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
        debit: 0,
        credit: taxTotal,
        description:
          `Input tax reversal for purchase return ${purchaseReturn.returnNumber}`,
        partyType: null,
        partyId: null,
        costCenter: null,
      });
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.PURCHASE_RETURN,
      sourceId: purchaseReturn.id,
      entryDate: purchaseReturn.returnDate,
      referenceNumber:
        purchaseReturn.returnNumber,
      currency: purchaseReturn.currency,
      narration:
        `Automatic posting for purchase return ${purchaseReturn.returnNumber}`,
      lines,
    };
  }

  private requireAccount(
    accountId: string | null | undefined,
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