import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesInvoiceItemEntity } from '../sales-invoices/entities/sales-invoice-item.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { SalesReturnItemEntity } from './entities/sales-return-item.entity';
import { SalesReturnEntity } from './entities/sales-return.entity';
import { SalesReturnsService } from './sales-returns.service';

describe('SalesReturnsService', () => {
  let service: SalesReturnsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesReturnsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SalesReturnEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesReturnItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesInvoiceEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesInvoiceItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WarehouseEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SalesReturnsService>(
      SalesReturnsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
