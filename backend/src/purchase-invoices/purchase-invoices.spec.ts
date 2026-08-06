import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { PurchaseOrderItemEntity } from '../purchase-orders/entities/purchase-order-item.entity';
import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { PurchaseInvoiceItemEntity } from './entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from './entities/purchase-invoice.entity';
import { PurchaseInvoicesService } from './purchase-invoices.service';

describe('PurchaseInvoicesService', () => {
  let service: PurchaseInvoicesService;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          PurchaseInvoicesService,
          {
            provide: DataSource,
            useValue: {
              transaction: jest.fn(),
            },
          },
          {
            provide: getRepositoryToken(
              PurchaseInvoiceEntity,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              PurchaseInvoiceItemEntity,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              SupplierEntity,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              PurchaseOrderEntity,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              PurchaseOrderItemEntity,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              GoodsReceipt,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              GoodsReceiptItem,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              ItemEntity,
            ),
            useValue: repositoryMock,
          },
        ],
      }).compile();

    service = module.get<PurchaseInvoicesService>(
      PurchaseInvoicesService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});