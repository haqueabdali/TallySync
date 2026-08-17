import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductionScheduleEntity } from '../production-scheduling/entities/production-schedule.entity';
import { CapacityPlanningController } from './capacity-planning.controller';
import { CapacityPlanningService } from './capacity-planning.service';
import { WorkCenterCapacityOverrideEntity } from './entities/work-center-capacity-override.entity';
import { WorkCenterEntity } from './entities/work-center.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkCenterEntity,
      WorkCenterCapacityOverrideEntity,
      ProductionScheduleEntity,
    ]),
  ],
  controllers: [CapacityPlanningController],
  providers: [CapacityPlanningService],
  exports: [CapacityPlanningService],
})
export class CapacityPlanningModule {}
