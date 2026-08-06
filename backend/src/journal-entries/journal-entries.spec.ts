import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from './entities/journal-entry-line.entity';
import { JournalEntryEntity } from './entities/journal-entry.entity';
import { JournalEntriesService } from './journal-entries.service';

describe('JournalEntriesService', () => {
  let service: JournalEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntriesService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryLineEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<JournalEntriesService>(
      JournalEntriesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
