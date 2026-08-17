import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  AccountingSettingsEntity,
} from '../../accounting-settings/entities/accounting-settings.entity';

import {
  JournalEntrySourceType,
} from '../../journal-entries/enums/journal-entry-source-type.enum';

import {
  ProductionOrderEntity,
} from '../../production-orders/entities/production-order.entity';

import {
  PostingDocument,
} from '../interfaces/posting-document.interface';

import {
  PostingRule,
} from '../interfaces/posting-rule.interface';

@Injectable()
export class ProductionCompletionPostingRule
  implements PostingRule<ProductionOrderEntity>
{
  constructor(
    @InjectRepository(ProductionOrderEntity)
    private readonly sourceRepository:
      Repository<ProductionOrderEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<ProductionOrderEntity> {
    const source =
      await this.sourceRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
      });

    if (!source) {
      throw new NotFoundException(
        'Production order not found.',
      );
    }

    return source;
  }

  async build(
    source: ProductionOrderEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (
      source.companyId !==
      companyId
    ) {
      throw new NotFoundException(
        'Production order not found.',
      );
    }

    const settings =
      await this.settingsRepository.findOne({
        where: { companyId },
      });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    const finishedGoods =
      this.requireAccount(
        settings.finishedGoodsInventoryAccountId,
        'Finished Goods Inventory',
      );

    const wip =
      this.requireAccount(
        settings.workInProgressAccountId,
        'Work In Progress',
      );

    const amount =
      this.round(
        Number(source.actualTotalCost),
      );

    if (amount <= 0) {
      throw new ConflictException(
        'Completed production cost must be greater than zero.',
      );
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.PRODUCTION_COMPLETION,
      sourceId:
        source.id,
      entryDate:
        new Date().toISOString().slice(0, 10),
      referenceNumber:
        String(source.orderNumber),
      narration:
        'Finished goods production completion',
      currency:
  settings.defaultCurrency ?? 'EUR',
        lines: [
        {
          accountId:
            finishedGoods,
          debit: amount,
          credit: 0,
          description:
            'Finished goods received from production',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
        {
          accountId: wip,
          debit: 0,
          credit: amount,
          description:
            'Work in progress transferred to finished goods',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
      ],
    };
  }

  private requireAccount(
    value: string | null,
    label: string,
  ): string {
    if (!value) {
      throw new ConflictException(
        `${label} account is not configured.`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100;
  }
}
