import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { CustomerPaymentAllocationEntity } from './entities/customer-payment-allocation.entity';
import { CustomerPaymentEntity } from './entities/customer-payment.entity';
import { CustomerPaymentsService } from './customer-payments.service';

describe('CustomerPaymentsService', () => {
  let service: CustomerPaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerPaymentsService,
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
          provide: getRepositoryToken(CustomerPaymentEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CustomerPaymentAllocationEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesInvoiceEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CustomerPaymentsService>(
      CustomerPaymentsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
