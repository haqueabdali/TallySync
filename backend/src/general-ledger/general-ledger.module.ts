import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { GeneralLedgerController } from './general-ledger.controller';
import { GeneralLedgerService } from './general-ledger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      JournalEntryEntity,
      JournalEntryLineEntity,
    ]),
  ],
  controllers: [GeneralLedgerController],
  providers: [GeneralLedgerService],
  exports: [GeneralLedgerService],
})
export class GeneralLedgerModule {}
