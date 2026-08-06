import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { ProfitAndLossController } from './profit-and-loss.controller';
import { ProfitAndLossService } from './profit-and-loss.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      JournalEntryLineEntity,
    ]),
  ],
  controllers: [ProfitAndLossController],
  providers: [ProfitAndLossService],
  exports: [ProfitAndLossService],
})
export class ProfitAndLossModule {}
