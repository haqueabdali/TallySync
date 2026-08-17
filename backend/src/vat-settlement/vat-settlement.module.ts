import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { VatReturnEntity } from '../vat-engine/entities/vat-return.entity';
import { VatSettlementSettingsEntity } from './entities/vat-settlement-settings.entity';
import { VatSettlementEntity } from './entities/vat-settlement.entity';
import { VatSettlementController } from './vat-settlement.controller';
import { VatSettlementService } from './vat-settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([VatSettlementSettingsEntity, VatSettlementEntity, AccountEntity, VatReturnEntity]), JournalEntriesModule],
  controllers: [VatSettlementController],
  providers: [VatSettlementService],
  exports: [VatSettlementService],
})
export class VatSettlementModule {}
