import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { InventoryCostBalanceEntity } from './entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from './entities/inventory-cost-transaction.entity';
import { InventoryCostSourceType } from './enums/inventory-cost-source-type.enum';
import { InventoryCostTransactionType } from './enums/inventory-cost-transaction-type.enum';
import { InventoryCostEngineService } from './inventory-cost-engine.service';

describe('InventoryCostEngineService', () => {
  const balanceRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<InventoryCostBalanceEntity>;

  const transactionRepository = {
    find: jest.fn(),
  } as unknown as Repository<InventoryCostTransactionEntity>;

  const dataSource = {} as DataSource;

  let service: InventoryCostEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryCostEngineService(
      balanceRepository,
      transactionRepository,
      dataSource,
    );
  });

  it('returns a company-scoped warehouse balance', async () => {
    const balance: InventoryCostBalanceEntity = {
      id: '4d99c821-9242-413d-8265-e65f19ef98ac',
      companyId: '32ba456e-7094-4571-bfc8-ff953aaac539',
      itemId: 'f9535b54-02f5-4ed6-9314-a6a0c03ca66a',
      warehouseId: 'b506e97e-86ff-4931-a9cc-a65dd24b4870',
      quantity: 10,
      averageUnitCost: 5,
      inventoryValue: 50,
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
      updatedAt: new Date('2026-08-05T00:00:00.000Z'),
    };
    jest.spyOn(balanceRepository, 'findOne').mockResolvedValue(balance);

    await expect(
      service.getBalance(balance.companyId, balance.itemId, balance.warehouseId),
    ).resolves.toEqual(balance);
  });

  it('throws when no cost balance exists', async () => {
    jest.spyOn(balanceRepository, 'findOne').mockResolvedValue(null);
    await expect(
      service.getBalance(
        '32ba456e-7094-4571-bfc8-ff953aaac539',
        'f9535b54-02f5-4ed6-9314-a6a0c03ca66a',
        'b506e97e-86ff-4931-a9cc-a65dd24b4870',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps immutable cost transactions', async () => {
    const row = {
      id: '2900fc97-82a1-4a8c-b133-40cda171dd53',
      companyId: '32ba456e-7094-4571-bfc8-ff953aaac539',
      itemId: 'f9535b54-02f5-4ed6-9314-a6a0c03ca66a',
      warehouseId: 'b506e97e-86ff-4931-a9cc-a65dd24b4870',
      transactionDate: '2026-08-05',
      transactionType: InventoryCostTransactionType.RECEIPT,
      sourceType: InventoryCostSourceType.GOODS_RECEIPT,
      sourceId: '3f09016c-13ab-42f6-b6ec-645a5c7cb98f',
      sourceLineId: '4bc90e54-a11c-42e3-bf27-cb9a6eb99d20',
      quantity: 10,
      unitCost: 5,
      totalCost: 50,
      quantityAfter: 10,
      averageUnitCostAfter: 5,
      inventoryValueAfter: 50,
      createdBy: null,
      createdAt: new Date('2026-08-05T00:00:00.000Z'),
    } as InventoryCostTransactionEntity;
    jest.spyOn(transactionRepository, 'find').mockResolvedValue([row]);

    const result = await service.getTransactions(
      row.companyId,
      row.itemId,
      row.warehouseId,
    );
    expect(result).toHaveLength(1);
    expect(result[0].totalCost).toBe(50);
  });
});
