import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillOfMaterialEntity } from '../bill-of-materials/entities/bill-of-material.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { ProductionOrderComponentEntity } from './entities/production-order-component.entity';
import { ProductionOrderEntity } from './entities/production-order.entity';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionOrderEntity,
      ProductionOrderComponentEntity,
      BillOfMaterialEntity,
      WarehouseEntity,
    ]),
  ],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService],
  exports: [ProductionOrdersService],
})
export class ProductionOrdersModule {}
