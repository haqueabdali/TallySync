import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceItemEntity } from '../purchase-invoices/entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { PurchaseReturnItem } from './entities/purchase-return-item.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnsService } from './purchase-returns.service';

describe('PurchaseReturnsService', () => {
  let service: PurchaseReturnsService;

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
          PurchaseReturnsService,
          {
            provide: DataSource,
            useValue: dataSourceMock,
          },
          {
            provide: getRepositoryToken(PurchaseReturn),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(PurchaseReturnItem),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(SupplierEntity),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(WarehouseEntity),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(PurchaseInvoiceEntity),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(PurchaseInvoiceItemEntity),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(GoodsReceipt),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(GoodsReceiptItem),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(ItemEntity),
            useValue: repositoryMock,
          },
        ],
      }).compile();

    service = module.get<PurchaseReturnsService>(
      PurchaseReturnsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});