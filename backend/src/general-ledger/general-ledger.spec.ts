import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { GeneralLedgerService } from './general-ledger.service';

describe('GeneralLedgerService', () => {
  let service: GeneralLedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneralLedgerService,
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(JournalEntryLineEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<GeneralLedgerService>(
      GeneralLedgerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
