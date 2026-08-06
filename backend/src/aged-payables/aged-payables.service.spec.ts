import type { Repository, SelectQueryBuilder } from 'typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { AgedPayablesFilterDto } from './dto/aged-payables-filter.dto';
import { AgedPayablesService } from './aged-payables.service';

type QueryBuilderMock = jest.Mocked<
  Pick<
    SelectQueryBuilder<PurchaseInvoiceEntity>,
    | 'innerJoin'
    | 'select'
    | 'addSelect'
    | 'where'
    | 'andWhere'
    | 'setParameter'
    | 'orderBy'
    | 'addOrderBy'
    | 'getRawMany'
  >
>;

describe('AgedPayablesService', () => {
  let queryBuilder: QueryBuilderMock;
  let repository: jest.Mocked<Pick<Repository<PurchaseInvoiceEntity>, 'createQueryBuilder'>>;
  let service: AgedPayablesService;

  beforeEach(() => {
    queryBuilder = {
      innerJoin: jest.fn(),
      select: jest.fn(),
      addSelect: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      setParameter: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      getRawMany: jest.fn(),
    } as unknown as QueryBuilderMock;

    for (const method of [
      'innerJoin',
      'select',
      'addSelect',
      'where',
      'andWhere',
      'setParameter',
      'orderBy',
      'addOrderBy',
    ] as const) {
      queryBuilder[method].mockReturnValue(queryBuilder);
    }

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    service = new AgedPayablesService(
      repository as unknown as Repository<PurchaseInvoiceEntity>,
    );
  });

  it('reconstructs historical outstanding amounts and aging buckets', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        invoiceId: 'invoice-1',
        invoiceNumber: 'PI-0001',
        supplierInvoiceNumber: 'SUP-101',
        invoiceDate: '2026-01-01',
        dueDate: '2026-01-31',
        currency: 'EUR',
        grandTotal: '1000.00',
        supplierId: 'supplier-1',
        supplierCode: 'SUP-001',
        supplierName: 'Example Supplier',
        supplierEmail: 'supplier@example.com',
        supplierPhone: null,
        paymentsApplied: '300.00',
        purchaseReturnsApplied: '100.00',
      },
    ]);

    const filter = Object.assign(new AgedPayablesFilterDto(), {
      asOfDate: '2026-03-15',
      includeNotYetDue: true,
      page: 1,
      limit: 50,
    });

    const result = await service.getReport(filter, 'company-1');

    expect(result.totals.days31To60).toBe(600);
    expect(result.totals.total).toBe(600);
    expect(result.suppliers[0].invoices[0]).toMatchObject({
      originalAmount: 1000,
      paymentsApplied: 300,
      purchaseReturnsApplied: 100,
      outstandingAmount: 600,
      bucket: 'days31To60',
    });
  });

  it('excludes not-yet-due invoices unless requested', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        invoiceId: 'invoice-1',
        invoiceNumber: 'PI-0001',
        supplierInvoiceNumber: null,
        invoiceDate: '2026-03-01',
        dueDate: '2026-04-01',
        currency: 'EUR',
        grandTotal: '100.00',
        supplierId: 'supplier-1',
        supplierCode: 'SUP-001',
        supplierName: 'Example Supplier',
        supplierEmail: null,
        supplierPhone: null,
        paymentsApplied: '0.00',
        purchaseReturnsApplied: '0.00',
      },
    ]);

    const filter = Object.assign(new AgedPayablesFilterDto(), {
      asOfDate: '2026-03-15',
      includeNotYetDue: false,
      page: 1,
      limit: 50,
    });

    const result = await service.getReport(filter, 'company-1');

    expect(result.suppliers).toEqual([]);
    expect(result.totals.total).toBe(0);
  });
});
