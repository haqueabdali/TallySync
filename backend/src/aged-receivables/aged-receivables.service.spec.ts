import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { AgedReceivablesService } from './aged-receivables.service';

describe('AgedReceivablesService', () => {
  let service: AgedReceivablesService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AgedReceivablesService,
        {
          provide: getRepositoryToken(SalesInvoiceEntity),
          useValue: {} as Partial<Repository<SalesInvoiceEntity>>,
        },
      ],
    }).compile();

    service = moduleRef.get(AgedReceivablesService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
