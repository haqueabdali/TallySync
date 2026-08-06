import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { LandedCostChargeEntity } from './entities/landed-cost-charge.entity';
import { LandedCostItemAllocationEntity } from './entities/landed-cost-item-allocation.entity';
import { LandedCostEntity } from './entities/landed-cost.entity';
import { LandedCostsService } from './landed-costs.service';

describe('LandedCostsService', () => {
  let service: LandedCostsService;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const dataSourceMock = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          LandedCostsService,
          { provide: DataSource, useValue: dataSourceMock },
          { provide: getRepositoryToken(LandedCostEntity), useValue: repositoryMock },
          { provide: getRepositoryToken(LandedCostChargeEntity), useValue: repositoryMock },
          { provide: getRepositoryToken(LandedCostItemAllocationEntity), useValue: repositoryMock },
          { provide: getRepositoryToken(GoodsReceipt), useValue: repositoryMock },
          { provide: getRepositoryToken(GoodsReceiptItem), useValue: repositoryMock },
          { provide: getRepositoryToken(PurchaseInvoiceEntity), useValue: repositoryMock },
          { provide: getRepositoryToken(SupplierEntity), useValue: repositoryMock },
          { provide: getRepositoryToken(ItemEntity), useValue: repositoryMock },
        ],
      }).compile();

    service = module.get<LandedCostsService>(LandedCostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
