import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { DeliveryNoteItemEntity } from '../delivery-notes/entities/delivery-note-item.entity';
import { DeliveryNoteEntity } from '../delivery-notes/entities/delivery-note.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { SalesInvoiceItemEntity } from './entities/sales-invoice-item.entity';
import { SalesInvoiceEntity } from './entities/sales-invoice.entity';
import { SalesInvoicesService } from './sales-invoices.service';

describe('SalesInvoicesService', () => {
  let service: SalesInvoicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesInvoicesService,
        {
          provide: AccountingEngineService,
          useValue: {
            autoPostSalesInvoice: jest.fn(),
            autoPostCustomerPayment: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
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
          provide: getRepositoryToken(SalesOrderEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesOrderItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DeliveryNoteEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DeliveryNoteItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SalesInvoicesService>(
      SalesInvoicesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
