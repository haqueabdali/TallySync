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
  ProductionVarianceEntity,
} from '../../production-variance/entities/production-variance.entity';

import {
  PostingDocument,
} from '../interfaces/posting-document.interface';

import {
  PostingRule,
} from '../interfaces/posting-rule.interface';

@Injectable()
export class ProductionVariancePostingRule
  implements PostingRule<ProductionVarianceEntity>
{
  constructor(
    @InjectRepository(ProductionVarianceEntity)
    private readonly sourceRepository:
      Repository<ProductionVarianceEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<ProductionVarianceEntity> {
    const source =
      await this.sourceRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
      });

    if (!source) {
      throw new NotFoundException(
        'Production variance not found.',
      );
    }

    return source;
  }

  async build(
    source: ProductionVarianceEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (
      source.companyId !==
      companyId
    ) {
      throw new NotFoundException(
        'Production variance not found.',
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

    const varianceAccount =
      this.requireAccount(
        settings.manufacturingVarianceAccountId,
        'Manufacturing Variance',
      );

    const wip =
      this.requireAccount(
        settings.workInProgressAccountId,
        'Work In Progress',
      );

    const signedVariance =
      this.round(
        Number(
          source.totalVariance,
        ),
      );

    if (
      Math.abs(
        signedVariance,
      ) <= 0.009
    ) {
      throw new ConflictException(
        'Production variance amount is zero.',
      );
    }

    const amount =
      Math.abs(
        signedVariance,
      );

    const unfavorable =
      signedVariance > 0;

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.PRODUCTION_VARIANCE,
      sourceId:
        source.id,
      entryDate:
        new Date().toISOString().slice(0, 10),
      referenceNumber:
        source.id,
      narration:
        'Production variance settlement',
      currency:
  settings.defaultCurrency ?? 'EUR',
      
        lines:
        unfavorable
          ? [
              {
                accountId:
                  varianceAccount,
                debit: amount,
                credit: 0,
                description:
                  'Unfavorable manufacturing variance',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
              {
                accountId: wip,
                debit: 0,
                credit: amount,
                description:
                  'WIP variance settlement',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
            ]
          : [
              {
                accountId: wip,
                debit: amount,
                credit: 0,
                description:
                  'WIP variance settlement',
                partyType: null,
                partyId: null,
                costCenter: null,
              },
              {
                accountId:
                  varianceAccount,
                debit: 0,
                credit: amount,
                description:
                  'Favorable manufacturing variance',
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
