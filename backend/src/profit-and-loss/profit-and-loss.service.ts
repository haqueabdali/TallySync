import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountType } from '../accounts/enums/account-type.enum';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { ProfitAndLossFilterDto } from './dto/profit-and-loss-filter.dto';
import {
  ProfitAndLossAccountLineResponseDto,
  ProfitAndLossResponseDto,
  ProfitAndLossSectionResponseDto,
} from './dto/profit-and-loss-response.dto';

interface ProfitAndLossRawRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  parentId: string | null;
  accountType: AccountType;
  debit: string | number | null;
  credit: string | number | null;
}

@Injectable()
export class ProfitAndLossService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryLineEntity)
    private readonly journalEntryLineRepository: Repository<JournalEntryLineEntity>,
  ) {}

  async getReport(
    filter: ProfitAndLossFilterDto,
    companyId: string,
  ): Promise<ProfitAndLossResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const rows = await this.getAccountBalances(filter, companyId);
    const includeZeroBalances = filter.includeZeroBalances ?? false;

    const incomeLines: ProfitAndLossAccountLineResponseDto[] = [];
    const expenseLines: ProfitAndLossAccountLineResponseDto[] = [];

    for (const row of rows) {
      const debit = Number(row.debit ?? 0);
      const credit = Number(row.credit ?? 0);
      const amount = this.round(
        row.accountType === AccountType.INCOME
          ? credit - debit
          : debit - credit,
      );

      if (!includeZeroBalances && amount === 0) {
        continue;
      }

      const line: ProfitAndLossAccountLineResponseDto = {
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        parentId: row.parentId,
        amount,
      };

      if (row.accountType === AccountType.INCOME) {
        incomeLines.push(line);
      } else {
        expenseLines.push(line);
      }
    }

    const income = this.createSection('income', incomeLines);
    const expenses = this.createSection('expense', expenseLines);
    const netProfit = this.round(income.total - expenses.total);

    return {
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      currency: filter.currency?.toUpperCase() ?? null,
      income,
      expenses,
      totalIncome: income.total,
      totalExpenses: expenses.total,
      netProfit,
      isProfit: netProfit >= 0,
    };
  }

  private async getAccountBalances(
    filter: ProfitAndLossFilterDto,
    companyId: string,
  ): Promise<ProfitAndLossRawRow[]> {
    const query = this.accountRepository
      .createQueryBuilder('account')
      .leftJoin(
        JournalEntryLineEntity,
        'line',
        'line.accountId = account.id',
      )
      .leftJoin(
        JournalEntryEntity,
        'entry',
        [
          'entry.id = line.journalEntryId',
          'entry.companyId = :companyId',
          'entry.status = :status',
          'entry.entryDate BETWEEN :dateFrom AND :dateTo',
          'entry.deletedAt IS NULL',
          filter.currency ? 'entry.currency = :currency' : null,
        ]
          .filter((condition): condition is string => condition !== null)
          .join(' AND '),
      )
      .select('account.id', 'accountId')
      .addSelect('account.code', 'accountCode')
      .addSelect('account.name', 'accountName')
      .addSelect('account.parentId', 'parentId')
      .addSelect('account.type', 'accountType')
      .addSelect(
        'COALESCE(SUM(CASE WHEN entry.id IS NOT NULL THEN line.debit ELSE 0 END), 0)',
        'debit',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN entry.id IS NOT NULL THEN line.credit ELSE 0 END), 0)',
        'credit',
      )
      .where('account.companyId = :companyId', { companyId })
      .andWhere('account.type IN (:...types)', {
        types: [AccountType.INCOME, AccountType.EXPENSE],
      })
      .andWhere('account.isGroup = false')
      .andWhere('account.deletedAt IS NULL')
      .setParameter('status', JournalEntryStatus.POSTED)
      .setParameter('dateFrom', filter.dateFrom)
      .setParameter('dateTo', filter.dateTo)
      .groupBy('account.id')
      .addGroupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('account.parentId')
      .addGroupBy('account.type')
      .orderBy('account.code', 'ASC');

    if (filter.currency) {
      query.setParameter('currency', filter.currency.toUpperCase());
    }

    return query.getRawMany<ProfitAndLossRawRow>();
  }

  private createSection(
    type: 'income' | 'expense',
    lines: ProfitAndLossAccountLineResponseDto[],
  ): ProfitAndLossSectionResponseDto {
    return {
      type,
      lines,
      total: this.round(lines.reduce((sum, line) => sum + line.amount, 0)),
    };
  }

  private validateDateRange(dateFrom: string, dateTo: string): void {
    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be before or equal to dateTo.');
    }
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
