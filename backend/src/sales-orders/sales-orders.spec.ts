import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { SalesQuotationItem } from '../sales-quotations/entities/sales-quotation-item.entity';
import { SalesQuotation } from '../sales-quotations/entities/sales-quotation.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrdersService } from './sales-orders.service';

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
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
        {
          provide: getRepositoryToken(SalesQuotation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesQuotationItem),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SalesOrdersService>(SalesOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
