import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CapacityPlanningModule } from '../capacity-planning/capacity-planning.module';
import { MaintenanceAssetEntity } from '../maintenance-management/entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from '../maintenance-management/entities/maintenance-downtime.entity';
import { MaintenanceWorkOrderEntity } from '../maintenance-management/entities/maintenance-work-order.entity';
import { ProductionScheduleEntity } from '../production-scheduling/entities/production-schedule.entity';
import { QualityInspectionEntity } from '../quality-management/entities/quality-inspection.entity';
import { AdvancedReportingController } from './advanced-reporting.controller';
import { AdvancedReportingService } from './advanced-reporting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionScheduleEntity,
      QualityInspectionEntity,
      MaintenanceAssetEntity,
      MaintenanceWorkOrderEntity,
      MaintenanceDowntimeEntity,
    ]),
    CapacityPlanningModule,
  ],
  controllers: [
    AdvancedReportingController,
  ],
  providers: [
    AdvancedReportingService,
  ],
  exports: [
    AdvancedReportingService,
  ],
})
export class AdvancedReportingModule {}
