import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PurchaseInvoice } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentsService } from './supplier-payments.service';

describe('SupplierPaymentsService', () => {
  let service: SupplierPaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierPaymentsService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupplierPayment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SupplierPaymentAllocation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SupplierEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PurchaseInvoice),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SupplierPaymentsService>(
      SupplierPaymentsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
