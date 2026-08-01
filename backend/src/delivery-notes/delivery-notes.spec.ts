import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { DeliveryNoteItemEntity } from './entities/delivery-note-item.entity';
import { DeliveryNoteEntity } from './entities/delivery-note.entity';
import { DeliveryNotesService } from './delivery-notes.service';

describe('DeliveryNotesService', () => {
  let service: DeliveryNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryNotesService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DeliveryNoteEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DeliveryNoteItemEntity),
          useValue: {},
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
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DeliveryNotesService>(
      DeliveryNotesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
