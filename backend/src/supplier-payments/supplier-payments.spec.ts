import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentStatus } from './enums/supplier-payment-status.enum';
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
    postSupplierPayment: jest.fn().mockResolvedValue(undefined),
  };

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
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(SupplierPaymentAllocation),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(SupplierEntity),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(PurchaseInvoiceEntity),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(AccountingSettingsEntity),
          useValue: settingsRepositoryMock,
        },
        {
          provide: AccountingEngineService,
          useValue: accountingEngineMock,
        },
      ],
    }).compile();

    service = module.get<SupplierPaymentsService>(SupplierPaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('refreshes allocation balance snapshots from the actual invoice balance when posting sequential payments', async () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const supplierId = '22222222-2222-4222-8222-222222222222';
    const invoiceId = '33333333-3333-4333-8333-333333333333';
    const userId = '44444444-4444-4444-8444-444444444444';

    const invoice = {
      id: invoiceId,
      companyId,
      supplierId,
      invoiceNumber: 'PI-REGRESSION-001',
      grandTotal: 25,
      paidAmount: 0,
      balanceDue: 25,
      status: PurchaseInvoiceStatus.Posted,
    } as PurchaseInvoiceEntity;

    const supplier = {
      id: supplierId,
      companyId,
      currentBalance: 25,
    } as SupplierEntity;

    const firstAllocation = {
      id: '55555555-5555-4555-8555-555555555555',
      supplierPaymentId: '66666666-6666-4666-8666-666666666666',
      purchaseInvoiceId: invoiceId,
      allocatedAmount: 10,

      // These intentionally represent stale draft-time values.
      invoiceBalanceBefore: 25,
      invoiceBalanceAfter: 15,
    } as SupplierPaymentAllocation;

    const secondAllocation = {
      id: '77777777-7777-4777-8777-777777777777',
      supplierPaymentId: '88888888-8888-4888-8888-888888888888',
      purchaseInvoiceId: invoiceId,
      allocatedAmount: 15,

      // This reproduces the old defect:
      // draft creation may still have seen 25 instead of the
      // actual posting-time balance of 15.
      invoiceBalanceBefore: 25,
      invoiceBalanceAfter: 10,
    } as SupplierPaymentAllocation;

    const firstPayment = {
      id: firstAllocation.supplierPaymentId,
      companyId,
      supplierId,
      paymentNumber: 'SPAY-REGRESSION-001',
      amount: 10,
      status: SupplierPaymentStatus.Draft,
      allocations: [firstAllocation],
      updatedBy: null,
    } as SupplierPayment;

    const secondPayment = {
      id: secondAllocation.supplierPaymentId,
      companyId,
      supplierId,
      paymentNumber: 'SPAY-REGRESSION-002',
      amount: 15,
      status: SupplierPaymentStatus.Draft,
      allocations: [secondAllocation],
      updatedBy: null,
    } as SupplierPayment;

    let activePayment = firstPayment;

    const paymentRepository = {
      findOne: jest.fn(async () => activePayment),
      save: jest.fn(async (payment: SupplierPayment) => payment),
    };

    const allocationRepository = {
      save: jest.fn(
        async (allocation: SupplierPaymentAllocation) => allocation,
      ),
    };

    const invoiceRepository = {
      findOne: jest.fn(async () => invoice),
      save: jest.fn(
        async (purchaseInvoice: PurchaseInvoiceEntity) => purchaseInvoice,
      ),
    };

    const supplierRepository = {
      findOne: jest.fn(async () => supplier),
      save: jest.fn(async (supplierEntity: SupplierEntity) => supplierEntity),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === SupplierPayment) {
          return paymentRepository;
        }

        if (entity === SupplierPaymentAllocation) {
          return allocationRepository;
        }

        if (entity === PurchaseInvoiceEntity) {
          return invoiceRepository;
        }

        if (entity === SupplierEntity) {
          return supplierRepository;
        }

        throw new Error('Unexpected repository requested in transaction.');
      }),
    };

    const dataSource = (service as any).dataSource as {
      transaction: jest.Mock;
    };

    dataSource.transaction.mockImplementation(
      async (callback: (transactionManager: typeof manager) => unknown) =>
        callback(manager),
    );

    repositoryMock.findOne.mockImplementation(
      async ({ where }: { where?: { id?: string } }) => {
        if (where?.id === firstPayment.id) {
          return firstPayment;
        }

        if (where?.id === secondPayment.id) {
          return secondPayment;
        }

        return null;
      },
    );

    settingsRepositoryMock.findOne.mockResolvedValue({
      autoPostSupplierPayments: false,
    });

    await service.post(firstPayment.id, companyId, userId);

    expect(firstAllocation.invoiceBalanceBefore).toBe(25);
    expect(firstAllocation.invoiceBalanceAfter).toBe(15);

    expect(invoice.paidAmount).toBe(10);
    expect(invoice.balanceDue).toBe(15);

    expect(allocationRepository.save).toHaveBeenCalledWith(firstAllocation);

    activePayment = secondPayment;

    await service.post(secondPayment.id, companyId, userId);

    expect(secondAllocation.invoiceBalanceBefore).toBe(15);
    expect(secondAllocation.invoiceBalanceAfter).toBe(0);

    expect(invoice.paidAmount).toBe(25);
    expect(invoice.balanceDue).toBe(0);

    expect(allocationRepository.save).toHaveBeenCalledWith(secondAllocation);

    expect(allocationRepository.save).toHaveBeenCalledTimes(2);
    expect(invoiceRepository.save).toHaveBeenCalledTimes(2);
  });
});
