import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { CashFlowController } from './cash-flow.controller';
import { CashFlowService } from './cash-flow.service';
import { CashFlowAccountMappingEntity } from './entities/cash-flow-account-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      JournalEntryLineEntity,
      CashFlowAccountMappingEntity,
    ]),
  ],
  controllers: [CashFlowController],
  providers: [CashFlowService],
  exports: [CashFlowService],
})
export class CashFlowModule {}
