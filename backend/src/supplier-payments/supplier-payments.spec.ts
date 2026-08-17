import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentsService } from './supplier-payments.service';

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

  const settingsRepositoryMock = {
    ...repositoryMock,
    findOne: jest.fn().mockResolvedValue({
      autoPostSupplierPayments: true,
    }),
  };

  const accountingEngineMock = {
    postSupplierPayment: jest
      .fn()
      .mockResolvedValue(undefined),
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
          {
            provide: getRepositoryToken(
              AccountingSettingsEntity,
            ),
            useValue:
              settingsRepositoryMock,
          },
          {
            provide:
              AccountingEngineService,
            useValue:
              accountingEngineMock,
          },
        ],
      }).compile();

    service =
      module.get<SupplierPaymentsService>(
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
