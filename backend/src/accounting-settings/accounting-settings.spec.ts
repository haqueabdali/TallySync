import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountingSettingsEntity } from './entities/accounting-settings.entity';
import { AccountingSettingsService } from './accounting-settings.service';

describe('AccountingSettingsService', () => {
  let service: AccountingSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingSettingsService,
        {
          provide: getRepositoryToken(AccountingSettingsEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountingSettingsService>(
      AccountingSettingsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
