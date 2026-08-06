import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentsService } from './supplier-payments.service';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';


describe('SupplierPaymentsService', () => {
  let service: SupplierPaymentsService;

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
          SupplierPaymentsService,
          {
            provide: DataSource,
            useValue: {
              transaction: jest.fn(),
            },
          },
          {
            provide: getRepositoryToken(
              SupplierPayment,
            ),
            useValue: repositoryMock,
          },
          {
            provide: getRepositoryToken(
              SupplierPaymentAllocation,
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
              PurchaseInvoiceEntity,
            ),
            useValue: repositoryMock,
          },
        ],
      }).compile();

    service = module.get<SupplierPaymentsService>(
      SupplierPaymentsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});