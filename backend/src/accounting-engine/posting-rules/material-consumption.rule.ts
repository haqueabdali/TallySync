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
  MaterialConsumptionEntity,
} from '../../material-consumption/entities/material-consumption.entity';

import {
  PostingDocument,
} from '../interfaces/posting-document.interface';

import {
  PostingRule,
} from '../interfaces/posting-rule.interface';

@Injectable()
export class MaterialConsumptionPostingRule
  implements PostingRule<MaterialConsumptionEntity>
{
  constructor(
    @InjectRepository(MaterialConsumptionEntity)
    private readonly sourceRepository:
      Repository<MaterialConsumptionEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<MaterialConsumptionEntity> {
    const source =
      await this.sourceRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          lines: true,
        } as never,
      });

    if (!source) {
      throw new NotFoundException(
        'Material consumption not found.',
      );
    }

    return source;
  }

  async build(
    source: MaterialConsumptionEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (
      source.companyId !==
      companyId
    ) {
      throw new NotFoundException(
        'Material consumption not found.',
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

    const wip =
      this.requireAccount(
        settings.workInProgressAccountId,
        'Work In Progress',
      );

    const rawMaterials =
      this.requireAccount(
        settings.rawMaterialsInventoryAccountId,
        'Raw Materials Inventory',
      );

    const amount =
      this.round(
        source.lines.reduce((sum, line) => sum + Number(line.totalCost), 0),
      );

    if (amount <= 0) {
      throw new ConflictException(
        'Material consumption cost must be greater than zero.',
      );
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.MATERIAL_CONSUMPTION,
      sourceId:
        source.id,
      entryDate:
        new Date().toISOString().slice(0, 10),
      referenceNumber:
        String(source.consumptionNumber),
      narration:
        'Material consumption capitalization into WIP',
      currency:
  settings.defaultCurrency ?? 'EUR',
        lines: [
        {
          accountId: wip,
          debit: amount,
          credit: 0,
          description:
            'Work in progress - material issue',
          partyType: null,
          partyId: null,
          costCenter: null,
        },
        {
          accountId:
            rawMaterials,
          debit: 0,
          credit: amount,
          description:
            'Raw materials issued to production',
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
