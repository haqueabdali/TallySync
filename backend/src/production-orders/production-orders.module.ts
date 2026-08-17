import {
  Module,
} from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  AccountingEngineModule,
} from '../accounting-engine/accounting-engine.module';
import {
  AccountingSettingsEntity,
} from '../accounting-settings/entities/accounting-settings.entity';
import {
  BillOfMaterialEntity,
} from '../bill-of-materials/entities/bill-of-material.entity';
import {
  WarehouseEntity,
} from '../warehouses/entities/warehouse.entity';

import {
  ProductionOrderComponentEntity,
} from './entities/production-order-component.entity';
import {
  ProductionOrderEntity,
} from './entities/production-order.entity';
import {
  ProductionOrdersController,
} from './production-orders.controller';
import {
  ProductionOrdersService,
} from './production-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingSettingsEntity,
      ProductionOrderEntity,
      ProductionOrderComponentEntity,
      BillOfMaterialEntity,
      WarehouseEntity,
    ]),

    /*
     * AccountingEngineModule exports AccountingEngineService.
     * Importing the module is the correct Nest DI boundary;
     * do not add AccountingEngineService directly to providers here.
     */
    AccountingEngineModule,
  ],

  controllers: [
    ProductionOrdersController,
  ],

  providers: [
    ProductionOrdersService,
  ],

  exports: [
    ProductionOrdersService,
  ],
})
export class ProductionOrdersModule {}