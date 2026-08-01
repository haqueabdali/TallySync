import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceItem } from '../purchase-invoices/entities/purchase-invoice-item.entity';
import { PurchaseInvoice } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { PurchaseReturnItem } from './entities/purchase-return-item.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnsService } from './purchase-returns.service';

describe('PurchaseReturnsService', () => {
  let service: PurchaseReturnsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseReturnsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PurchaseReturn),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PurchaseReturnItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SupplierEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WarehouseEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PurchaseInvoice),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PurchaseInvoiceItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(GoodsReceipt),
          useValue: {},
        },
        {
          provide: getRepositoryToken(GoodsReceiptItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PurchaseReturnsService>(
      PurchaseReturnsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
