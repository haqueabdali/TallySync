import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovingAverageCostingModule } from '../inventory-cost-engine/moving-average/moving-average-costing.module';
import { ProductionOrderComponentEntity } from '../production-orders/entities/production-order-component.entity';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { MaterialConsumptionController } from './material-consumption.controller';
import { MaterialConsumptionLineEntity } from './entities/material-consumption-line.entity';
import { MaterialConsumptionEntity } from './entities/material-consumption.entity';
import { MaterialConsumptionService } from './material-consumption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialConsumptionEntity,
      MaterialConsumptionLineEntity,
      ProductionOrderEntity,
      ProductionOrderComponentEntity,
    ]),
    MovingAverageCostingModule,
  ],
  controllers: [MaterialConsumptionController],
  providers: [MaterialConsumptionService],
  exports: [MaterialConsumptionService],
})
export class MaterialConsumptionModule {}
