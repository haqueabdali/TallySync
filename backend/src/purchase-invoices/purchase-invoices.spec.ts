import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { PurchaseInvoiceItem } from './entities/purchase-invoice-item.entity';
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseInvoicesService } from './purchase-invoices.service';

describe('PurchaseInvoicesService', () => {
  let service: PurchaseInvoicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseInvoicesService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
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
          provide: getRepositoryToken(SupplierEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PurchaseOrderEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(GoodsReceipt),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PurchaseInvoicesService>(
      PurchaseInvoicesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
