import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { BalanceSheetController } from './balance-sheet.controller';
import { BalanceSheetService } from './balance-sheet.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  controllers: [BalanceSheetController],
  providers: [BalanceSheetService],
  exports: [BalanceSheetService],
})
export class BalanceSheetModule {}
