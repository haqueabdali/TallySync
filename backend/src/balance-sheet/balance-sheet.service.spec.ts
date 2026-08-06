import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountType } from '../accounts/enums/account-type.enum';
import { BalanceSheetService } from './balance-sheet.service';

describe('BalanceSheetService', () => {
  let service: BalanceSheetService;
  let accountRepository: Pick<Repository<AccountEntity>, 'createQueryBuilder'>;

  beforeEach(async () => {
    accountRepository = {
      createQueryBuilder: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BalanceSheetService,
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: accountRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(BalanceSheetService);
  });

  it('calculates unclosed earnings and a balanced accounting equation', async () => {
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          accountId: 'asset-id',
          accountCode: '1000',
          accountName: 'Cash',
          parentId: null,
          accountType: AccountType.ASSET,
          debit: 150,
          credit: 0,
        },
        {
          accountId: 'liability-id',
          accountCode: '2000',
          accountName: 'Payables',
          parentId: null,
          accountType: AccountType.LIABILITY,
          debit: 0,
          credit: 50,
        },
        {
          accountId: 'equity-id',
          accountCode: '3000',
          accountName: 'Capital',
          parentId: null,
          accountType: AccountType.EQUITY,
          debit: 0,
          credit: 60,
        },
        {
          accountId: 'income-id',
          accountCode: '4000',
          accountName: 'Revenue',
          parentId: null,
          accountType: AccountType.INCOME,
          debit: 0,
          credit: 80,
        },
        {
          accountId: 'expense-id',
          accountCode: '5000',
          accountName: 'Expense',
          parentId: null,
          accountType: AccountType.EXPENSE,
          debit: 40,
          credit: 0,
        },
      ]),
    };

    (accountRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      queryBuilder,
    );

    const result = await service.getReport(
      { asOfDate: '2026-12-31' },
      'company-id',
    );

    expect(result.totalAssets).toBe(150);
    expect(result.totalLiabilities).toBe(50);
    expect(result.totalEquityBeforeEarnings).toBe(60);
    expect(result.earnings.unclosedEarnings).toBe(40);
    expect(result.totalLiabilitiesAndEquity).toBe(150);
    expect(result.isBalanced).toBe(true);
  });
});
