import type { Repository, SelectQueryBuilder } from 'typeorm';

import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { AgedReceivablesFilterDto } from './dto/aged-receivables-filter.dto';
import { AgedReceivablesService } from './aged-receivables.service';

type QueryBuilderMock = jest.Mocked<
  Pick<
    SelectQueryBuilder<SalesInvoiceEntity>,
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

describe('AgedReceivablesService', () => {
  let queryBuilder: QueryBuilderMock;
  let repository: jest.Mocked<
    Pick<Repository<SalesInvoiceEntity>, 'createQueryBuilder'>
  >;
  let service: AgedReceivablesService;

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

    service = new AgedReceivablesService(
      repository as unknown as Repository<SalesInvoiceEntity>,
    );
  });

  it('places ISO timestamp due dates into the correct aging bucket', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        invoiceId: 'invoice-1',
        invoiceNumber: 'SI-0001',
        invoiceDate: '2026-08-01T00:00:00.000Z',
        dueDate: '2026-08-14T00:00:00.000Z',
        currency: 'EUR',
        grandTotal: '40.00',
        customerId: 'customer-1',
        customerName: 'Example Customer',
        customerEmail: 'customer@example.com',
        customerPhone: null,
        paymentsApplied: '0.00',
        salesReturnsApplied: '0.00',
      },
    ]);

    const filter = Object.assign(new AgedReceivablesFilterDto(), {
      asOfDate: '2026-09-14',
      includeNotYetDue: true,
      page: 1,
      limit: 50,
    });

    const result = await service.getReport(filter, 'company-1');

    expect(result.totals.days31To60).toBe(40);
    expect(result.totals.over120Days).toBe(0);
    expect(result.totals.total).toBe(40);

    expect(result.customers[0].invoices[0]).toMatchObject({
      daysPastDue: 31,
      outstandingAmount: 40,
      bucket: 'days31To60',
    });
  });

  it('excludes fully settled invoices', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      {
        invoiceId: 'invoice-1',
        invoiceNumber: 'SI-0001',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-14',
        currency: 'EUR',
        grandTotal: '40.00',
        customerId: 'customer-1',
        customerName: 'Example Customer',
        customerEmail: null,
        customerPhone: null,
        paymentsApplied: '40.00',
        salesReturnsApplied: '0.00',
      },
    ]);

    const filter = Object.assign(new AgedReceivablesFilterDto(), {
      asOfDate: '2026-09-14',
      includeNotYetDue: true,
      page: 1,
      limit: 50,
    });

    const result = await service.getReport(filter, 'company-1');

    expect(result.totals.total).toBe(0);
    expect(result.customers).toEqual([]);
  });
});