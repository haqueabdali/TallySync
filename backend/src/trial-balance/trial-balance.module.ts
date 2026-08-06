import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { TrialBalanceController } from './trial-balance.controller';
import { TrialBalanceService } from './trial-balance.service';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntryLineEntity])],
  controllers: [TrialBalanceController],
  providers: [TrialBalanceService],
  exports: [TrialBalanceService],
})
export class TrialBalanceModule {}
