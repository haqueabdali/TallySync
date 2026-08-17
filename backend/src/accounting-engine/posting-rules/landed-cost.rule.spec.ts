import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AccountingSettingsEntity } from '../../accounting-settings/entities/accounting-settings.entity';
import { JournalEntrySourceType } from '../../journal-entries/enums/journal-entry-source-type.enum';
import { LandedCostChargeEntity } from '../../landed-costs/entities/landed-cost-charge.entity';
import { LandedCostEntity } from '../../landed-costs/entities/landed-cost.entity';
import { LandedCostStatus } from '../../landed-costs/enums/landed-cost-status.enum';
import { LandedCostType } from '../../landed-costs/enums/landed-cost-type.enum';
import { LandedCostPostingRule } from './landed-cost.rule';

type LandedCostRepositoryMock = jest.Mocked<
  Pick<Repository<LandedCostEntity>, 'findOne'>
>;

type AccountingSettingsRepositoryMock = jest.Mocked<
  Pick<Repository<AccountingSettingsEntity>, 'findOne'>
>;

function firstLandedCostType(): LandedCostType {
  const value = Object.values(LandedCostType)[0];
  if (value === undefined) {
    throw new Error('LandedCostType enum has no values');
  }
  return value;
}

function createCharge(
  amount: number,
  supplierId: string | null = null,
): LandedCostChargeEntity {
  const charge = new LandedCostChargeEntity();
  charge.id = '11111111-1111-4111-8111-111111111111';
  charge.landedCostId = '22222222-2222-4222-8222-222222222222';
  charge.costType = firstLandedCostType();
  charge.supplierId = supplierId;
  charge.referenceNumber = null;
  charge.amount = amount;
  charge.description = null;
  return charge;
}

function createLandedCost(
  overrides: Partial<LandedCostEntity> = {},
): LandedCostEntity {
  const landedCost = new LandedCostEntity();
  landedCost.id = overrides.id ?? '22222222-2222-4222-8222-222222222222';
  landedCost.companyId =
    overrides.companyId ?? '33333333-3333-4333-8333-333333333333';
  landedCost.landedCostNumber =
    overrides.landedCostNumber ?? 'LC-2026-000001';
  landedCost.costDate = overrides.costDate ?? '2026-08-07';
  landedCost.status = overrides.status ?? LandedCostStatus.Posted;
  landedCost.currency = overrides.currency ?? 'EUR';
  landedCost.totalCost = overrides.totalCost ?? 150;
  landedCost.charges =
    overrides.charges ?? [
      createCharge(100, '44444444-4444-4444-8444-444444444444'),
      createCharge(50),
    ];
  landedCost.itemAllocations = overrides.itemAllocations ?? [];
  return landedCost;
}

function createSettings(
  companyId: string,
): AccountingSettingsEntity {
  const settings = new AccountingSettingsEntity();
  settings.id = '55555555-5555-4555-8555-555555555555';
  settings.companyId = companyId;
  settings.inventoryAccountId =
    '66666666-6666-4666-8666-666666666666';
  settings.accountsPayableAccountId =
    '77777777-7777-4777-8777-777777777777';
  return settings;
}

describe('LandedCostPostingRule', () => {
  let rule: LandedCostPostingRule;
  let landedCostRepository: LandedCostRepositoryMock;
  let settingsRepository: AccountingSettingsRepositoryMock;

  beforeEach(async () => {
    landedCostRepository = { findOne: jest.fn() };
    settingsRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostPostingRule,
        {
          provide: getRepositoryToken(LandedCostEntity),
          useValue: landedCostRepository,
        },
        {
          provide: getRepositoryToken(AccountingSettingsEntity),
          useValue: settingsRepository,
        },
      ],
    }).compile();

    rule = module.get(LandedCostPostingRule);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads a company-scoped landed cost', async () => {
    const landedCost = createLandedCost();
    landedCostRepository.findOne.mockResolvedValue(landedCost);

    await expect(
      rule.load(landedCost.id, landedCost.companyId),
    ).resolves.toBe(landedCost);

    expect(landedCostRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: landedCost.id,
        companyId: landedCost.companyId,
      },
      relations: {
        charges: true,
        itemAllocations: true,
      },
    });
  });

  it('throws when the landed cost does not exist', async () => {
    landedCostRepository.findOne.mockResolvedValue(null);

    await expect(
      rule.load(
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds a balanced inventory/AP document', async () => {
    const landedCost = createLandedCost();
    const settings = createSettings(landedCost.companyId);
    settingsRepository.findOne.mockResolvedValue(settings);

    const document = await rule.build(
      landedCost,
      landedCost.companyId,
    );

    expect(document.sourceType).toBe(
      JournalEntrySourceType.LANDED_COST,
    );
    expect(document.lines).toHaveLength(3);

    expect(document.lines[0]).toEqual(
      expect.objectContaining({
        accountId: settings.inventoryAccountId,
        debit: 150,
        credit: 0,
      }),
    );

    const debit = document.lines.reduce(
      (sum, line) => sum + Number(line.debit),
      0,
    );
    const credit = document.lines.reduce(
      (sum, line) => sum + Number(line.credit),
      0,
    );

    expect(debit).toBe(150);
    expect(credit).toBe(150);
  });

  it('maps supplier party data on supplier charges', async () => {
    const supplierId =
      '44444444-4444-4444-8444-444444444444';
    const landedCost = createLandedCost({
      totalCost: 100,
      charges: [
        createCharge(60, supplierId),
        createCharge(40),
      ],
    });

    settingsRepository.findOne.mockResolvedValue(
      createSettings(landedCost.companyId),
    );

    const document = await rule.build(
      landedCost,
      landedCost.companyId,
    );

    expect(document.lines[1]).toEqual(
      expect.objectContaining({
        partyType: 'supplier',
        partyId: supplierId,
      }),
    );
    expect(document.lines[2]).toEqual(
      expect.objectContaining({
        partyType: null,
        partyId: null,
      }),
    );
  });

  it('rejects another company', async () => {
    const landedCost = createLandedCost();

    await expect(
      rule.build(
        landedCost,
        '88888888-8888-4888-8888-888888888888',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a non-posted landed cost', async () => {
    const landedCost = createLandedCost({
      status: LandedCostStatus.Draft,
    });

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects missing charges', async () => {
    const landedCost = createLandedCost({ charges: [] });

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects missing accounting settings', async () => {
    const landedCost = createLandedCost();
    settingsRepository.findOne.mockResolvedValue(null);

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects missing inventory account', async () => {
    const landedCost = createLandedCost();
    const settings = createSettings(landedCost.companyId);
    settings.inventoryAccountId = null;
    settingsRepository.findOne.mockResolvedValue(settings);

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects missing accounts payable account', async () => {
    const landedCost = createLandedCost();
    const settings = createSettings(landedCost.companyId);
    settings.accountsPayableAccountId = null;
    settingsRepository.findOne.mockResolvedValue(settings);

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a non-positive document total', async () => {
    const landedCost = createLandedCost({
      totalCost: 0,
      charges: [createCharge(100)],
    });
    settingsRepository.findOne.mockResolvedValue(
      createSettings(landedCost.companyId),
    );

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects mismatched charge totals', async () => {
    const landedCost = createLandedCost({
      totalCost: 150,
      charges: [createCharge(100)],
    });
    settingsRepository.findOne.mockResolvedValue(
      createSettings(landedCost.companyId),
    );

    await expect(
      rule.build(landedCost, landedCost.companyId),
    ).rejects.toThrow(ConflictException);
  });
});
