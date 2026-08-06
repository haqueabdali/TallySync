import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountType } from '../accounts/enums/account-type.enum';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { BalanceSheetFilterDto } from './dto/balance-sheet-filter.dto';
import {
  BalanceSheetAccountLineResponseDto,
  BalanceSheetResponseDto,
  BalanceSheetSectionResponseDto,
} from './dto/balance-sheet-response.dto';

interface BalanceSheetRawRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  parentId: string | null;
  accountType: AccountType;
  debit: string | number | null;
  credit: string | number | null;
}

@Injectable()
export class BalanceSheetService {
  private static readonly BALANCE_TOLERANCE = 0.01;

  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async getReport(
    filter: BalanceSheetFilterDto,
    companyId: string,
  ): Promise<BalanceSheetResponseDto> {
    const rows = await this.getAccountBalances(filter, companyId);
    const includeZeroBalances = filter.includeZeroBalances ?? false;

    const assetLines: BalanceSheetAccountLineResponseDto[] = [];
    const liabilityLines: BalanceSheetAccountLineResponseDto[] = [];
    const equityLines: BalanceSheetAccountLineResponseDto[] = [];
    let cumulativeIncome = 0;
    let cumulativeExpenses = 0;

    for (const row of rows) {
      const debit = Number(row.debit ?? 0);
      const credit = Number(row.credit ?? 0);

      if (row.accountType === AccountType.INCOME) {
        cumulativeIncome += credit - debit;
        continue;
      }

      if (row.accountType === AccountType.EXPENSE) {
        cumulativeExpenses += debit - credit;
        continue;
      }

      const amount = this.round(
        row.accountType === AccountType.ASSET
          ? debit - credit
          : credit - debit,
      );

      if (!includeZeroBalances && amount === 0) {
        continue;
      }

      const line: BalanceSheetAccountLineResponseDto = {
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        parentId: row.parentId,
        amount,
      };

      if (row.accountType === AccountType.ASSET) {
        assetLines.push(line);
      } else if (row.accountType === AccountType.LIABILITY) {
        liabilityLines.push(line);
      } else if (row.accountType === AccountType.EQUITY) {
        equityLines.push(line);
      }
    }

    const assets = this.createSection('asset', assetLines);
    const liabilities = this.createSection('liability', liabilityLines);
    const equity = this.createSection('equity', equityLines);
    const roundedIncome = this.round(cumulativeIncome);
    const roundedExpenses = this.round(cumulativeExpenses);
    const unclosedEarnings = this.round(roundedIncome - roundedExpenses);
    const totalEquity = this.round(equity.total + unclosedEarnings);
    const totalLiabilitiesAndEquity = this.round(
      liabilities.total + totalEquity,
    );
    const difference = this.round(
      assets.total - totalLiabilitiesAndEquity,
    );

    return {
      asOfDate: filter.asOfDate,
      currency: filter.currency?.toUpperCase() ?? null,
      assets,
      liabilities,
      equity,
      earnings: {
        cumulativeIncome: roundedIncome,
        cumulativeExpenses: roundedExpenses,
        unclosedEarnings,
      },
      totalAssets: assets.total,
      totalLiabilities: liabilities.total,
      totalEquityBeforeEarnings: equity.total,
      totalEquity,
      totalLiabilitiesAndEquity,
      difference,
      isBalanced:
        Math.abs(difference) <= BalanceSheetService.BALANCE_TOLERANCE,
    };
  }

  private async getAccountBalances(
    filter: BalanceSheetFilterDto,
    companyId: string,
  ): Promise<BalanceSheetRawRow[]> {
    const joinConditions = [
      'entry.id = line.journalEntryId',
      'entry.companyId = :companyId',
      'entry.status = :status',
      'entry.entryDate <= :asOfDate',
      'entry.deletedAt IS NULL',
      filter.currency ? 'entry.currency = :currency' : null,
    ]
      .filter((condition): condition is string => condition !== null)
      .join(' AND ');

    const query = this.accountRepository
      .createQueryBuilder('account')
      .leftJoin(
        JournalEntryLineEntity,
        'line',
        'line.accountId = account.id',
      )
      .leftJoin(JournalEntryEntity, 'entry', joinConditions)
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
        types: [
          AccountType.ASSET,
          AccountType.LIABILITY,
          AccountType.EQUITY,
          AccountType.INCOME,
          AccountType.EXPENSE,
        ],
      })
      .andWhere('account.isGroup = false')
      .andWhere('account.deletedAt IS NULL')
      .setParameter('status', JournalEntryStatus.POSTED)
      .setParameter('asOfDate', filter.asOfDate)
      .groupBy('account.id')
      .addGroupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('account.parentId')
      .addGroupBy('account.type')
      .orderBy('account.code', 'ASC');

    if (filter.currency) {
      query.setParameter('currency', filter.currency.toUpperCase());
    }

    return query.getRawMany<BalanceSheetRawRow>();
  }

  private createSection(
    type: 'asset' | 'liability' | 'equity',
    lines: BalanceSheetAccountLineResponseDto[],
  ): BalanceSheetSectionResponseDto {
    return {
      type,
      lines,
      total: this.round(lines.reduce((sum, line) => sum + line.amount, 0)),
    };
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
