import {
  Module,
} from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  AccountEntity,
} from '../accounts/entities/account.entity';
import {
  AccountingEngineModule,
} from '../accounting-engine/accounting-engine.module';
import {
  AccountingSettingsEntity,
} from '../accounting-settings/entities/accounting-settings.entity';
import {
  JournalEntriesModule,
} from '../journal-entries/journal-entries.module';
import {
  MaterialConsumptionLineEntity,
} from '../material-consumption/entities/material-consumption-line.entity';
import {
  WipAccountingSettingsEntity,
} from '../manufacturing-wip-accounting/entities/wip-accounting-settings.entity';
import {
  WipPostingEntity,
} from '../manufacturing-wip-accounting/entities/wip-posting.entity';
import {
  ProductionOrderEntity,
} from '../production-orders/entities/production-order.entity';

import {
  ProductionVarianceLineEntity,
} from './entities/production-variance-line.entity';
import {
  ProductionVarianceSettingsEntity,
} from './entities/production-variance-settings.entity';
import {
  ProductionVarianceEntity,
} from './entities/production-variance.entity';
import {
  ProductionVarianceController,
} from './production-variance.controller';
import {
  ProductionVarianceService,
} from './production-variance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingSettingsEntity,
      ProductionVarianceSettingsEntity,
      ProductionVarianceEntity,
      ProductionVarianceLineEntity,
      ProductionOrderEntity,
      MaterialConsumptionLineEntity,
      WipPostingEntity,
      WipAccountingSettingsEntity,
      AccountEntity,
    ]),
    AccountingEngineModule,
    JournalEntriesModule,
  ],

  controllers: [
    ProductionVarianceController,
  ],

  providers: [
    ProductionVarianceService,
  ],

  exports: [
    ProductionVarianceService,
  ],
})
export class ProductionVarianceModule {}