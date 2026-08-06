import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { TrialBalanceQueryDto } from './dto/trial-balance-query.dto';
import {
  TrialBalanceLineDto,
  TrialBalanceResponseDto,
  TrialBalanceTotalsDto,
} from './dto/trial-balance-response.dto';

interface TrialBalanceRawRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currency: string;
  openingDebit: string | number;
  openingCredit: string | number;
  periodDebit: string | number;
  periodCredit: string | number;
}

@Injectable()
export class TrialBalanceService {
  private static readonly BALANCE_TOLERANCE = 0.01;

  constructor(
    @InjectRepository(JournalEntryLineEntity)
    private readonly journalEntryLineRepository: Repository<JournalEntryLineEntity>,
  ) {}

  async getTrialBalance(
    companyId: string,
    query: TrialBalanceQueryDto,
  ): Promise<TrialBalanceResponseDto> {
    this.validateDateRange(query.dateFrom, query.dateTo);

    const currency = query.currency?.trim().toUpperCase();
    const search = query.search?.trim();

    const builder = this.journalEntryLineRepository.manager
      .createQueryBuilder(AccountEntity, 'account')
      .leftJoin(
        JournalEntryLineEntity,
        'line',
        'line.account_id = account.id',
      )
      .leftJoin(
        JournalEntryEntity,
        'entry',
        'entry.id = line.journal_entry_id AND entry.company_id = :companyId AND entry.status = :postedStatus',
        {
          companyId,
          postedStatus: JournalEntryStatus.POSTED,
        },
      )
      .select('account.id', 'accountId')
      .addSelect('account.code', 'accountCode')
      .addSelect('account.name', 'accountName')
      .addSelect('account.type', 'accountType')
      .addSelect('account.currency', 'currency')
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN :dateFrom IS NOT NULL AND entry.entry_date < :dateFrom
          THEN line.debit ELSE 0 END), 0)`,
        'openingDebit',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN :dateFrom IS NOT NULL AND entry.entry_date < :dateFrom
          THEN line.credit ELSE 0 END), 0)`,
        'openingCredit',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN (:dateFrom IS NULL OR entry.entry_date >= :dateFrom)
           AND (:dateTo IS NULL OR entry.entry_date <= :dateTo)
          THEN line.debit ELSE 0 END), 0)`,
        'periodDebit',
      )
      .addSelect(
        `COALESCE(SUM(CASE
          WHEN (:dateFrom IS NULL OR entry.entry_date >= :dateFrom)
           AND (:dateTo IS NULL OR entry.entry_date <= :dateTo)
          THEN line.credit ELSE 0 END), 0)`,
        'periodCredit',
      )
      .where('account.company_id = :companyId', { companyId })
      .andWhere('account.is_group = false')
      .andWhere('account.deleted_at IS NULL')
      .setParameters({
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
      });

    if (currency) {
      builder.andWhere('account.currency = :currency', { currency });
    }

    if (query.accountType) {
      builder.andWhere('account.type = :accountType', {
        accountType: query.accountType,
      });
    }

    if (search) {
      builder.andWhere(
        '(account.code ILIKE :search OR account.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const rows = await builder
      .groupBy('account.id')
      .addGroupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('account.type')
      .addGroupBy('account.currency')
      .orderBy('account.code', 'ASC')
      .getRawMany<TrialBalanceRawRow>();

    const lines = rows
      .map((row): TrialBalanceLineDto => {
        const openingDebitRaw = Number(row.openingDebit ?? 0);
        const openingCreditRaw = Number(row.openingCredit ?? 0);
        const periodDebit = this.round(Number(row.periodDebit ?? 0));
        const periodCredit = this.round(Number(row.periodCredit ?? 0));

        const opening = this.netToSides(
          openingDebitRaw - openingCreditRaw,
        );
        const closing = this.netToSides(
          openingDebitRaw - openingCreditRaw + periodDebit - periodCredit,
        );

        return {
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          accountType: row.accountType as AccountEntity['type'],
          currency: row.currency,
          openingDebit: opening.debit,
          openingCredit: opening.credit,
          periodDebit,
          periodCredit,
          closingDebit: closing.debit,
          closingCredit: closing.credit,
        };
      })
      .filter((line) =>
        query.includeZeroBalances
          ? true
          : this.hasNonZeroBalance(line),
      );

    const totals = this.calculateTotals(lines);
    const openingDifference = this.round(
      totals.openingDebit - totals.openingCredit,
    );
    const periodDifference = this.round(
      totals.periodDebit - totals.periodCredit,
    );
    const closingDifference = this.round(
      totals.closingDebit - totals.closingCredit,
    );

    return {
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      currency: currency ?? null,
      totals,
      openingDifference,
      periodDifference,
      closingDifference,
      isBalanced:
        Math.abs(openingDifference) < TrialBalanceService.BALANCE_TOLERANCE &&
        Math.abs(periodDifference) < TrialBalanceService.BALANCE_TOLERANCE &&
        Math.abs(closingDifference) < TrialBalanceService.BALANCE_TOLERANCE,
      lines,
    };
  }

  private calculateTotals(
    lines: TrialBalanceLineDto[],
  ): TrialBalanceTotalsDto {
    return lines.reduce<TrialBalanceTotalsDto>(
      (totals, line) => ({
        openingDebit: this.round(totals.openingDebit + line.openingDebit),
        openingCredit: this.round(totals.openingCredit + line.openingCredit),
        periodDebit: this.round(totals.periodDebit + line.periodDebit),
        periodCredit: this.round(totals.periodCredit + line.periodCredit),
        closingDebit: this.round(totals.closingDebit + line.closingDebit),
        closingCredit: this.round(totals.closingCredit + line.closingCredit),
      }),
      {
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      },
    );
  }

  private hasNonZeroBalance(line: TrialBalanceLineDto): boolean {
    return [
      line.openingDebit,
      line.openingCredit,
      line.periodDebit,
      line.periodCredit,
      line.closingDebit,
      line.closingCredit,
    ].some((value) => Math.abs(value) >= 0.005);
  }

  private netToSides(net: number): { debit: number; credit: number } {
    const rounded = this.round(net);

    return rounded >= 0
      ? { debit: rounded, credit: 0 }
      : { debit: 0, credit: this.round(Math.abs(rounded)) };
  }

  private validateDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException(
        'dateFrom must be earlier than or equal to dateTo.',
      );
    }
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
