import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { SalesQuotationItem } from './entities/sales-quotation-item.entity';
import { SalesQuotation } from './entities/sales-quotation.entity';
import { SalesQuotationsService } from './sales-quotations.service';

describe('SalesQuotationsService', () => {
  let service: SalesQuotationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesQuotationsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SalesQuotation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesQuotationItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SalesQuotationsService>(
      SalesQuotationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});