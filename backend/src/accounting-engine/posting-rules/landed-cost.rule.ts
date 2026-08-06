import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { LandedCostEntity } from '../../landed-costs/entities/landed-cost.entity';
import { LandedCostStatus } from '../../landed-costs/enums/landed-cost-status.enum';
import { PostingDocument } from '../interfaces/posting-document.interface';
import { PostingRule } from '../interfaces/posting-rule.interface';

@Injectable()
export class LandedCostPostingRule
  implements PostingRule<LandedCostEntity>
{
  constructor(
    @InjectRepository(LandedCostEntity)
    private readonly landedCostRepository:
      Repository<LandedCostEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository:
      Repository<AccountingSettingsEntity>,
  ) {}

  async load(
    sourceId: string,
    companyId: string,
  ): Promise<LandedCostEntity> {
    const landedCost =
      await this.landedCostRepository.findOne({
        where: {
          id: sourceId,
          companyId,
        },
        relations: {
          charges: true,
          itemAllocations: true,
        },
      });

    if (!landedCost) {
      throw new NotFoundException(
        'Landed cost document not found.',
      );
    }

    return landedCost;
  }

  async build(
    landedCost: LandedCostEntity,
    companyId: string,
  ): Promise<PostingDocument> {
    if (landedCost.companyId !== companyId) {
      throw new NotFoundException(
        'Landed cost document not found.',
      );
    }

    if (landedCost.status !== LandedCostStatus.Posted) {
      throw new ConflictException(
        'Only posted landed cost documents can create accounting entries.',
      );
    }

    if (!landedCost.charges?.length) {
      throw new ConflictException(
        'Landed cost document must contain at least one charge.',
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

    const inventoryAccountId =
      this.requireAccount(
        settings.inventoryAccountId,
        'Inventory',
      );

    const accountsPayableAccountId =
      this.requireAccount(
        settings.accountsPayableAccountId,
        'Accounts Payable',
      );

    const totalCost = this.round(
      Number(landedCost.totalCost),
    );

    if (totalCost <= 0) {
      throw new ConflictException(
        'Landed cost total must be greater than zero.',
      );
    }

    const chargeTotal = this.round(
      landedCost.charges.reduce(
        (sum, charge) =>
          sum + Number(charge.amount),
        0,
      ),
    );

    if (
      Math.abs(chargeTotal - totalCost) > 0.009
    ) {
      throw new ConflictException(
        'Landed cost charge total does not match the document total.',
      );
    }

    const lines: PostingDocument['lines'] = [
      {
        accountId: inventoryAccountId,
        debit: totalCost,
        credit: 0,
        description:
          `Inventory capitalization for landed cost ${landedCost.landedCostNumber}`,
        partyType: null,
        partyId: null,
        costCenter: null,
      },
    ];

    for (const charge of landedCost.charges) {
      const amount = this.round(
        Number(charge.amount),
      );

      if (amount <= 0) {
        throw new ConflictException(
          `Charge ${charge.costType} must be greater than zero.`,
        );
      }

      lines.push({
        accountId: accountsPayableAccountId,
        debit: 0,
        credit: amount,
        description:
          charge.description ??
          `${charge.costType} for landed cost ${landedCost.landedCostNumber}`,
        partyType: charge.supplierId
          ? 'supplier'
          : null,
        partyId: charge.supplierId ?? null,
        costCenter: null,
      });
    }

    return {
      companyId,
      sourceType:
        JournalEntrySourceType.LANDED_COST,
      sourceId: landedCost.id,
      entryDate: landedCost.costDate,
      referenceNumber:
        landedCost.landedCostNumber,
      currency: landedCost.currency,
      narration:
        `Automatic posting for landed cost ${landedCost.landedCostNumber}`,
      lines,
    };
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