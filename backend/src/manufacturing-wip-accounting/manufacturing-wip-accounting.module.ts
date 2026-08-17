import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { FinishedGoodsReceiptEntity } from '../finished-goods/entities/finished-goods-receipt.entity';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { MaterialConsumptionEntity } from '../material-consumption/entities/material-consumption.entity';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { WipAccountingSettingsEntity } from './entities/wip-accounting-settings.entity';
import { WipPostingEntity } from './entities/wip-posting.entity';
import { ManufacturingWipAccountingController } from './manufacturing-wip-accounting.controller';
import { ManufacturingWipAccountingService } from './manufacturing-wip-accounting.service';

@Module({
  imports: [TypeOrmModule.forFeature([WipAccountingSettingsEntity, WipPostingEntity, AccountEntity, AccountingSettingsEntity, MaterialConsumptionEntity, FinishedGoodsReceiptEntity, ProductionOrderEntity]), JournalEntriesModule],
  controllers: [ManufacturingWipAccountingController],
  providers: [ManufacturingWipAccountingService],
  exports: [ManufacturingWipAccountingService],
})
export class ManufacturingWipAccountingModule {}
