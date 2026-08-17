import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualCostAdjustmentLineEntity } from './entities/manual-cost-adjustment-line.entity';
import { ManualCostAdjustmentEntity } from './entities/manual-cost-adjustment.entity';
import { ManualCostAdjustmentsController } from './manual-cost-adjustments.controller';
import { ManualCostAdjustmentsService } from './manual-cost-adjustments.service';
@Module({
  imports: [TypeOrmModule.forFeature([ManualCostAdjustmentEntity, ManualCostAdjustmentLineEntity])],
  controllers: [ManualCostAdjustmentsController],
  providers: [ManualCostAdjustmentsService],
  exports: [ManualCostAdjustmentsService],
})
export class ManualCostAdjustmentsModule {}
