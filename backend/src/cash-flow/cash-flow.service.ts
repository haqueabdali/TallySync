import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { CashFlowReportFilterDto } from './dto/cash-flow-report-filter.dto';
import {
  CashFlowAccountLineResponseDto,
  CashFlowReportResponseDto,
  CashFlowSectionResponseDto,
} from './dto/cash-flow-response.dto';
import { UpsertCashFlowAccountMappingDto } from './dto/upsert-cash-flow-account-mapping.dto';
import { CashFlowAccountMappingEntity } from './entities/cash-flow-account-mapping.entity';
import { CashFlowActivity } from './enums/cash-flow-activity.enum';

interface CashBalanceRawRow {
  balance: string | number | null;
}

interface MovementRawRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  activity: CashFlowActivity | null;
  amount: string | number;
}

@Injectable()
export class CashFlowService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryLineEntity)
    private readonly journalEntryLineRepository: Repository<JournalEntryLineEntity>,
    @InjectRepository(CashFlowAccountMappingEntity)
    private readonly mappingRepository: Repository<CashFlowAccountMappingEntity>,
  ) {}

  async upsertMapping(
    dto: UpsertCashFlowAccountMappingDto,
    companyId: string,
  ): Promise<CashFlowAccountMappingEntity> {
    const account = await this.accountRepository.findOne({
      where: { id: dto.accountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (account.isGroup) {
      throw new BadRequestException('A group account cannot be mapped for cash flow.');
    }

    let mapping = await this.mappingRepository.findOne({
      where: { companyId, accountId: dto.accountId },
    });

    if (!mapping) {
      mapping = this.mappingRepository.create({
        companyId,
        accountId: dto.accountId,
      });
    }

    mapping.activity = dto.activity;
    mapping.displayOrder = dto.displayOrder ?? mapping.displayOrder ?? 0;
    mapping.description = dto.description ?? mapping.description ?? null;

    return this.mappingRepository.save(mapping);
  }

  async listMappings(companyId: string): Promise<CashFlowAccountMappingEntity[]> {
    return this.mappingRepository.find({
      where: { companyId },
      relations: { account: true },
      order: { activity: 'ASC', displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async removeMapping(id: string, companyId: string): Promise<void> {
    const mapping = await this.mappingRepository.findOne({
      where: { id, companyId },
    });

    if (!mapping) {
      throw new NotFoundException('Cash-flow account mapping not found.');
    }

    await this.mappingRepository.remove(mapping);
  }

  async getReport(
    filter: CashFlowReportFilterDto,
    companyId: string,
  ): Promise<CashFlowReportResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const mappings = await this.mappingRepository.find({
      where: { companyId },
      relations: { account: true },
    });

    const cashMappings = mappings.filter(
      (mapping) => mapping.activity === CashFlowActivity.CASH,
    );

    if (cashMappings.length === 0) {
      throw new BadRequestException(
        'Configure at least one cash or bank account with activity CASH.',
      );
    }

    const cashAccountIds = cashMappings.map((mapping) => mapping.accountId);
    const openingCashBalance = await this.getCashBalance(
      companyId,
      cashAccountIds,
      filter.dateFrom,
      filter.currency,
    );

    const movements = await this.getCounterpartMovements(
      companyId,
      cashAccountIds,
      filter,
    );

    const lineMap = new Map<string, CashFlowAccountLineResponseDto>();
    const unmappedAccountIds = new Set<string>();

    for (const row of movements) {
      const amount = this.round(Number(row.amount));
      if (amount === 0) {
        continue;
      }

      if (!row.activity || row.activity === CashFlowActivity.CASH) {
        unmappedAccountIds.add(row.accountId);
        continue;
      }

      const key = `${row.activity}:${row.accountId}`;
      const existing = lineMap.get(key);
      if (existing) {
        existing.amount = this.round(existing.amount + amount);
      } else {
        lineMap.set(key, {
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          activity: row.activity,
          amount,
        });
      }
    }

    const sections = [
      CashFlowActivity.OPERATING,
      CashFlowActivity.INVESTING,
      CashFlowActivity.FINANCING,
    ].map((activity): CashFlowSectionResponseDto => {
      const lines = [...lineMap.values()]
        .filter((line) => line.activity === activity)
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      return {
        activity,
        total: this.round(lines.reduce((sum, line) => sum + line.amount, 0)),
        lines,
      };
    });

    const operating = this.sectionTotal(sections, CashFlowActivity.OPERATING);
    const investing = this.sectionTotal(sections, CashFlowActivity.INVESTING);
    const financing = this.sectionTotal(sections, CashFlowActivity.FINANCING);
    const netCashMovement = this.round(operating + investing + financing);

    return {
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      currency: filter.currency?.toUpperCase() ?? null,
      openingCashBalance,
      netOperatingCashFlow: operating,
      netInvestingCashFlow: investing,
      netFinancingCashFlow: financing,
      netCashMovement,
      closingCashBalance: this.round(openingCashBalance + netCashMovement),
      sections,
      unmappedAccountIds: [...unmappedAccountIds],
    };
  }

  private async getCashBalance(
    companyId: string,
    cashAccountIds: string[],
    dateFrom: string,
    currency?: string,
  ): Promise<number> {
    const query = this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .select('COALESCE(SUM(line.debit - line.credit), 0)', 'balance')
      .where('entry.companyId = :companyId', { companyId })
      .andWhere('entry.status = :status', { status: JournalEntryStatus.POSTED })
      .andWhere('entry.entryDate < :dateFrom', { dateFrom })
      .andWhere('line.accountId IN (:...cashAccountIds)', { cashAccountIds })
      .andWhere('entry.deletedAt IS NULL');

    if (currency) {
      query.andWhere('entry.currency = :currency', {
        currency: currency.toUpperCase(),
      });
    }

    const row = await query.getRawOne<CashBalanceRawRow>();
    return this.round(Number(row?.balance ?? 0));
  }

  private async getCounterpartMovements(
    companyId: string,
    cashAccountIds: string[],
    filter: CashFlowReportFilterDto,
  ): Promise<MovementRawRow[]> {
    const entriesWithCash = this.journalEntryLineRepository
      .createQueryBuilder('cashLine')
      .select('cashLine.journalEntryId')
      .innerJoin('cashLine.journalEntry', 'cashEntry')
      .where('cashEntry.companyId = :companyId', { companyId })
      .andWhere('cashEntry.status = :status', {
        status: JournalEntryStatus.POSTED,
      })
      .andWhere('cashEntry.entryDate BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      })
      .andWhere('cashLine.accountId IN (:...cashAccountIds)', {
        cashAccountIds,
      })
      .andWhere('cashEntry.deletedAt IS NULL');

    if (filter.currency) {
      entriesWithCash.andWhere('cashEntry.currency = :currency', {
        currency: filter.currency.toUpperCase(),
      });
    }

    return this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .innerJoin('line.account', 'account')
      .leftJoin(
        CashFlowAccountMappingEntity,
        'mapping',
        'mapping.accountId = line.accountId AND mapping.companyId = entry.companyId',
      )
      .select('line.accountId', 'accountId')
      .addSelect('account.code', 'accountCode')
      .addSelect('account.name', 'accountName')
      .addSelect('mapping.activity', 'activity')
      .addSelect('SUM(line.credit - line.debit)', 'amount')
      .where(`line.journalEntryId IN (${entriesWithCash.getQuery()})`)
      .andWhere('line.accountId NOT IN (:...cashAccountIds)', {
        cashAccountIds,
      })
      .setParameters(entriesWithCash.getParameters())
      .groupBy('line.accountId')
      .addGroupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('mapping.activity')
      .getRawMany<MovementRawRow>();
  }

  private validateDateRange(dateFrom: string, dateTo: string): void {
    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo.');
    }
  }

  private sectionTotal(
    sections: CashFlowSectionResponseDto[],
    activity: CashFlowActivity,
  ): number {
    return sections.find((section) => section.activity === activity)?.total ?? 0;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
