import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountNormalBalance } from '../accounts/enums/account-normal-balance.enum';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { AccountLedgerFilterDto } from './dto/account-ledger-filter.dto';
import { GeneralLedgerFilterDto } from './dto/general-ledger-filter.dto';
import {
  GeneralLedgerAccountResponseDto,
  GeneralLedgerLineResponseDto,
  GeneralLedgerSummaryResponseDto,
} from './dto/general-ledger-response.dto';
import { TrialBalanceFilterDto } from './dto/trial-balance-filter.dto';
import {
  TrialBalanceLineResponseDto,
  TrialBalanceResponseDto,
} from './dto/trial-balance-response.dto';

interface LedgerRawRow {
  journalEntryId: string;
  journalEntryLineId: string;
  entryNumber: string;
  entryDate: string;
  sourceType: string;
  sourceId: string | null;
  referenceNumber: string | null;
  narration: string | null;
  currency: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: AccountNormalBalance;
  debit: string | number;
  credit: string | number;
  partyType: string | null;
  partyId: string | null;
  costCenter: string | null;
  description: string | null;
}

interface BalanceRawRow {
  accountId: string;
  debit: string | number;
  credit: string | number;
}

@Injectable()
export class GeneralLedgerService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,

    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,

    @InjectRepository(JournalEntryLineEntity)
    private readonly journalEntryLineRepository: Repository<JournalEntryLineEntity>,
  ) {}

  async getGeneralLedger(
    filter: GeneralLedgerFilterDto,
    companyId: string,
  ): Promise<GeneralLedgerSummaryResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const accounts = await this.getAccounts(
      companyId,
      filter.accountId,
      filter.currency,
      filter.search,
    );

    const result: GeneralLedgerAccountResponseDto[] = [];

    for (const account of accounts) {
      result.push(
        await this.getAccountLedgerInternal(
          account,
          {
            dateFrom: filter.dateFrom,
            dateTo: filter.dateTo,
            partyType: filter.partyType,
            partyId: filter.partyId,
            costCenter: filter.costCenter,
          },
          companyId,
        ),
      );
    }

    return {
      dateFrom: filter.dateFrom ?? null,
      dateTo: filter.dateTo ?? null,
      currency: filter.currency?.toUpperCase() ?? null,
      totalDebit: this.round(
        result.reduce(
          (sum, account) => sum + account.totalDebit,
          0,
        ),
      ),
      totalCredit: this.round(
        result.reduce(
          (sum, account) => sum + account.totalCredit,
          0,
        ),
      ),
      accounts: result,
    };
  }

  async getAccountLedger(
    accountId: string,
    filter: AccountLedgerFilterDto,
    companyId: string,
  ): Promise<GeneralLedgerAccountResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const account = await this.accountRepository.findOne({
      where: {
        id: accountId,
        companyId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (account.isGroup) {
      throw new BadRequestException(
        'General ledger cannot be generated for a group account.',
      );
    }

    return this.getAccountLedgerInternal(
      account,
      filter,
      companyId,
    );
  }

  async getTrialBalance(
    filter: TrialBalanceFilterDto,
    companyId: string,
  ): Promise<TrialBalanceResponseDto> {
    this.validateDateRange(filter.dateFrom, filter.dateTo);

    const accounts = await this.accountRepository.find({
      where: {
        companyId,
        isGroup: false,
        ...(filter.currency
          ? { currency: filter.currency.toUpperCase() }
          : {}),
      },
      order: {
        code: 'ASC',
      },
    });

    const openingMap = await this.getBalanceMap(
      companyId,
      filter.dateFrom,
      undefined,
      filter.currency,
    );

    const periodMap = await this.getBalanceMap(
      companyId,
      filter.dateFrom,
      filter.dateTo,
      filter.currency,
      true,
    );

    const lines: TrialBalanceLineResponseDto[] = accounts.map(
      (account) => {
        const opening = openingMap.get(account.id) ?? {
          debit: 0,
          credit: 0,
        };

        const period = periodMap.get(account.id) ?? {
          debit: 0,
          credit: 0,
        };

        const openingNet = this.getSignedBalance(
          account.normalBalance,
          opening.debit,
          opening.credit,
        );

        const periodNet = this.getSignedBalance(
          account.normalBalance,
          period.debit,
          period.credit,
        );

        const closingNet = this.round(
          openingNet + periodNet,
        );

        const openingSides = this.toDebitCreditSides(
          account.normalBalance,
          openingNet,
        );

        const closingSides = this.toDebitCreditSides(
          account.normalBalance,
          closingNet,
        );

        return {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          openingDebit: openingSides.debit,
          openingCredit: openingSides.credit,
          periodDebit: this.round(period.debit),
          periodCredit: this.round(period.credit),
          closingDebit: closingSides.debit,
          closingCredit: closingSides.credit,
        };
      },
    );

    return {
      dateFrom: filter.dateFrom ?? null,
      dateTo: filter.dateTo ?? null,
      currency: filter.currency?.toUpperCase() ?? null,
      openingDebitTotal: this.round(
        lines.reduce(
          (sum, line) => sum + line.openingDebit,
          0,
        ),
      ),
      openingCreditTotal: this.round(
        lines.reduce(
          (sum, line) => sum + line.openingCredit,
          0,
        ),
      ),
      periodDebitTotal: this.round(
        lines.reduce(
          (sum, line) => sum + line.periodDebit,
          0,
        ),
      ),
      periodCreditTotal: this.round(
        lines.reduce(
          (sum, line) => sum + line.periodCredit,
          0,
        ),
      ),
      closingDebitTotal: this.round(
        lines.reduce(
          (sum, line) => sum + line.closingDebit,
          0,
        ),
      ),
      closingCreditTotal: this.round(
        lines.reduce(
          (sum, line) => sum + line.closingCredit,
          0,
        ),
      ),
      lines,
    };
  }

  private async getAccountLedgerInternal(
    account: AccountEntity,
    filter: AccountLedgerFilterDto,
    companyId: string,
  ): Promise<GeneralLedgerAccountResponseDto> {
    const opening = await this.getOpeningBalance(
      account.id,
      companyId,
      filter.dateFrom,
      filter.partyType,
      filter.partyId,
      filter.costCenter,
    );

    const rows = await this.getLedgerRows(
      account.id,
      companyId,
      filter,
    );

    let runningBalance = opening;
    let totalDebit = 0;
    let totalCredit = 0;

    const lines: GeneralLedgerLineResponseDto[] = rows.map(
      (row) => {
        const debit = Number(row.debit ?? 0);
        const credit = Number(row.credit ?? 0);

        totalDebit = this.round(totalDebit + debit);
        totalCredit = this.round(totalCredit + credit);

        runningBalance = this.round(
          runningBalance +
            this.getSignedBalance(
              account.normalBalance,
              debit,
              credit,
            ),
        );

        return {
          journalEntryId: row.journalEntryId,
          journalEntryLineId: row.journalEntryLineId,
          entryNumber: row.entryNumber,
          entryDate: row.entryDate,
          sourceType: row.sourceType as any,
          sourceId: row.sourceId,
          referenceNumber: row.referenceNumber,
          accountId: row.accountId,
          accountCode: row.accountCode,
          accountName: row.accountName,
          debit,
          credit,
          runningBalance,
          partyType: row.partyType,
          partyId: row.partyId,
          costCenter: row.costCenter,
          description: row.description,
          narration: row.narration,
        };
      },
    );

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      normalBalance: account.normalBalance,
      currency: account.currency,
      openingBalance: opening,
      totalDebit,
      totalCredit,
      closingBalance: runningBalance,
      lines,
    };
  }

  private async getAccounts(
    companyId: string,
    accountId?: string,
    currency?: string,
    search?: string,
  ): Promise<AccountEntity[]> {
    const query = this.accountRepository
      .createQueryBuilder('account')
      .where('account.company_id = :companyId', {
        companyId,
      })
      .andWhere('account.is_group = false');

    if (accountId) {
      query.andWhere('account.id = :accountId', {
        accountId,
      });
    }

    if (currency) {
      query.andWhere('account.currency = :currency', {
        currency: currency.toUpperCase(),
      });
    }

    if (search?.trim()) {
      const value = `%${search.trim()}%`;

      query.andWhere(
        '(account.code ILIKE :value OR account.name ILIKE :value)',
        { value },
      );
    }

    return query
      .orderBy('account.code', 'ASC')
      .getMany();
  }

  private async getLedgerRows(
    accountId: string,
    companyId: string,
    filter: AccountLedgerFilterDto,
  ): Promise<LedgerRawRow[]> {
    const query = this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin(
        JournalEntryEntity,
        'entry',
        'entry.id = line.journal_entry_id',
      )
      .innerJoin(
        AccountEntity,
        'account',
        'account.id = line.account_id',
      )
      .select([
        'entry.id AS "journalEntryId"',
        'line.id AS "journalEntryLineId"',
        'entry.entry_number AS "entryNumber"',
        'entry.entry_date AS "entryDate"',
        'entry.source_type AS "sourceType"',
        'entry.source_id AS "sourceId"',
        'entry.reference_number AS "referenceNumber"',
        'entry.narration AS "narration"',
        'entry.currency AS "currency"',
        'account.id AS "accountId"',
        'account.code AS "accountCode"',
        'account.name AS "accountName"',
        'account.type AS "accountType"',
        'account.normal_balance AS "normalBalance"',
        'line.debit AS "debit"',
        'line.credit AS "credit"',
        'line.party_type AS "partyType"',
        'line.party_id AS "partyId"',
        'line.cost_center AS "costCenter"',
        'line.description AS "description"',
      ])
      .where('entry.company_id = :companyId', {
        companyId,
      })
      .andWhere('entry.status = :status', {
        status: JournalEntryStatus.POSTED,
      })
      .andWhere('line.account_id = :accountId', {
        accountId,
      });

    if (filter.dateFrom) {
      query.andWhere('entry.entry_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('entry.entry_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    if (filter.partyType) {
      query.andWhere('line.party_type = :partyType', {
        partyType: filter.partyType,
      });
    }

    if (filter.partyId) {
      query.andWhere('line.party_id = :partyId', {
        partyId: filter.partyId,
      });
    }

    if (filter.costCenter) {
      query.andWhere('line.cost_center = :costCenter', {
        costCenter: filter.costCenter,
      });
    }

    return query
      .orderBy('entry.entry_date', 'ASC')
      .addOrderBy('entry.entry_number', 'ASC')
      .addOrderBy('line.id', 'ASC')
      .getRawMany<LedgerRawRow>();
  }

  private async getOpeningBalance(
    accountId: string,
    companyId: string,
    dateFrom?: string,
    partyType?: string,
    partyId?: string,
    costCenter?: string,
  ): Promise<number> {
    if (!dateFrom) {
      return 0;
    }

    const account = await this.accountRepository.findOne({
      where: {
        id: accountId,
        companyId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const query = this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin(
        JournalEntryEntity,
        'entry',
        'entry.id = line.journal_entry_id',
      )
      .select('COALESCE(SUM(line.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(line.credit), 0)', 'credit')
      .where('entry.company_id = :companyId', {
        companyId,
      })
      .andWhere('entry.status = :status', {
        status: JournalEntryStatus.POSTED,
      })
      .andWhere('line.account_id = :accountId', {
        accountId,
      })
      .andWhere('entry.entry_date < :dateFrom', {
        dateFrom,
      });

    if (partyType) {
      query.andWhere('line.party_type = :partyType', {
        partyType,
      });
    }

    if (partyId) {
      query.andWhere('line.party_id = :partyId', {
        partyId,
      });
    }

    if (costCenter) {
      query.andWhere('line.cost_center = :costCenter', {
        costCenter,
      });
    }

    const raw = await query.getRawOne<{
      debit?: string | number;
      credit?: string | number;
    }>();

    return this.getSignedBalance(
      account.normalBalance,
      Number(raw?.debit ?? 0),
      Number(raw?.credit ?? 0),
    );
  }

  private async getBalanceMap(
    companyId: string,
    dateFrom?: string,
    dateTo?: string,
    currency?: string,
    includeDateFrom = false,
  ): Promise<
    Map<string, { debit: number; credit: number }>
  > {
    const query = this.journalEntryLineRepository
      .createQueryBuilder('line')
      .innerJoin(
        JournalEntryEntity,
        'entry',
        'entry.id = line.journal_entry_id',
      )
      .innerJoin(
        AccountEntity,
        'account',
        'account.id = line.account_id',
      )
      .select('line.account_id', 'accountId')
      .addSelect('COALESCE(SUM(line.debit), 0)', 'debit')
      .addSelect('COALESCE(SUM(line.credit), 0)', 'credit')
      .where('entry.company_id = :companyId', {
        companyId,
      })
      .andWhere('entry.status = :status', {
        status: JournalEntryStatus.POSTED,
      });

    if (dateFrom) {
      query.andWhere(
        includeDateFrom
          ? 'entry.entry_date >= :dateFrom'
          : 'entry.entry_date < :dateFrom',
        { dateFrom },
      );
    }

    if (dateTo) {
      query.andWhere('entry.entry_date <= :dateTo', {
        dateTo,
      });
    }

    if (currency) {
      query.andWhere('entry.currency = :currency', {
        currency: currency.toUpperCase(),
      });
    }

    const rows = await query
      .groupBy('line.account_id')
      .getRawMany<BalanceRawRow>();

    return new Map(
      rows.map((row) => [
        row.accountId,
        {
          debit: Number(row.debit ?? 0),
          credit: Number(row.credit ?? 0),
        },
      ]),
    );
  }

  private getSignedBalance(
    normalBalance: AccountNormalBalance,
    debit: number,
    credit: number,
  ): number {
    return this.round(
      normalBalance === AccountNormalBalance.DEBIT
        ? debit - credit
        : credit - debit,
    );
  }

  private toDebitCreditSides(
    normalBalance: AccountNormalBalance,
    signedBalance: number,
  ): { debit: number; credit: number } {
    if (signedBalance === 0) {
      return { debit: 0, credit: 0 };
    }

    if (normalBalance === AccountNormalBalance.DEBIT) {
      return signedBalance > 0
        ? { debit: this.round(signedBalance), credit: 0 }
        : { debit: 0, credit: this.round(Math.abs(signedBalance)) };
    }

    return signedBalance > 0
      ? { debit: 0, credit: this.round(signedBalance) }
      : { debit: this.round(Math.abs(signedBalance)), credit: 0 };
  }

  private validateDateRange(
    dateFrom?: string,
    dateTo?: string,
  ): void {
    if (
      dateFrom &&
      dateTo &&
      new Date(dateFrom).getTime() >
        new Date(dateTo).getTime()
    ) {
      throw new BadRequestException(
        'dateFrom cannot be later than dateTo.',
      );
    }
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
