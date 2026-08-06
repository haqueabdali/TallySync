import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { GoodsReceipt } from '../../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptStatus } from '../../goods-receipts/enums/goods-receipt-status.enum';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

@Injectable()
export class GoodsReceiptPostingRule
  implements PostingRule<GoodsReceipt>
{
  constructor(
    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository:
      Repository<GoodsReceipt>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<GoodsReceipt> {
    const goodsReceipt =
      await this.goodsReceiptRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          items: true,
        },
      });

    if (!goodsReceipt) {
      throw new NotFoundException(
        'Goods receipt not found.',
      );
    }

    return goodsReceipt;
  }

  async build(
    goodsReceipt: GoodsReceipt,
    companyId: string,
  ): Promise<PostingDocument> {
    if (goodsReceipt.companyId !== companyId) {
      throw new NotFoundException(
        'Goods receipt not found.',
      );
    }

    if (
      goodsReceipt.status !== GoodsReceiptStatus.Posted
    ) {
      throw new ConflictException(
        'Only posted goods receipts can create accounting entries.',
      );
    }

    if (!goodsReceipt.items?.length) {
      throw new ConflictException(
        'Goods receipt must contain at least one item.',
      );
    }

    const settings = await this.getSettings(companyId);

    const inventoryAccountId =
      this.requireAccount(
        settings.inventoryAccountId,
        'Inventory',
      );

    const grniAccountId =
      this.requireAccount(
        settings.goodsReceivedNotInvoicedAccountId,
        'Goods Received Not Invoiced',
      );

    const inventoryValue = this.round(
      goodsReceipt.items.reduce(
        (sum, item) =>
          sum +
          Number(item.acceptedQty) *
            Number(item.unitCost),
        0,
      ),
    );

    if (inventoryValue <= 0) {
      throw new ConflictException(
        'Goods receipt inventory value must be greater than zero.',
      );
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.GOODS_RECEIPT,
      sourceId: goodsReceipt.id,
      entryDate: this.toDateString(
        goodsReceipt.grnDate,
      ),
      referenceNumber: goodsReceipt.grnNumber,
      currency: settings.defaultCurrency,
      narration:
        `Automatic posting for goods receipt ${goodsReceipt.grnNumber}`,
      lines: [
        {
          accountId: inventoryAccountId,
          debit: inventoryValue,
          credit: 0,
          description:
            `Inventory received under ${goodsReceipt.grnNumber}`,
          partyType: null,
          partyId: null,
          costCenter: null,
        },
        {
          accountId: grniAccountId,
          debit: 0,
          credit: inventoryValue,
          description:
            `GRNI liability for ${goodsReceipt.grnNumber}`,
          partyType: null,
          partyId: null,
          costCenter: null,
        },
      ],
    };
  }

  private async getSettings(
    companyId: string,
  ): Promise<AccountingSettingsEntity> {
    const settings =
      await this.settingsRepository.findOne({
        where: { companyId },
      });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    if (!settings.autoPostGoodsReceipts) {
      throw new ConflictException(
        'Automatic posting for goods receipts is disabled.',
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

  private toDateString(
    value: Date | string,
  ): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }

  private round(value: number): number {
    return Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100;
  }
}