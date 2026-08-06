import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovingAverageCostingModule } from '../inventory-cost-engine/moving-average/moving-average-costing.module';
import { MaterialConsumptionLineEntity } from '../material-consumption/entities/material-consumption-line.entity';
import { MaterialConsumptionEntity } from '../material-consumption/entities/material-consumption.entity';
import { ProductionOrderEntity } from '../production-orders/entities/production-order.entity';
import { FinishedGoodsReceiptEntity } from './entities/finished-goods-receipt.entity';
import { FinishedGoodsController } from './finished-goods.controller';
import { FinishedGoodsService } from './finished-goods.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinishedGoodsReceiptEntity,
      ProductionOrderEntity,
      MaterialConsumptionEntity,
      MaterialConsumptionLineEntity,
    ]),
    MovingAverageCostingModule,
  ],
  controllers: [FinishedGoodsController],
  providers: [FinishedGoodsService],
  exports: [FinishedGoodsService],
})
export class FinishedGoodsModule {}
