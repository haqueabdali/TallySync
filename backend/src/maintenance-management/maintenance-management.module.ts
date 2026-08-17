import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MaintenanceAssetEntity } from './entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from './entities/maintenance-downtime.entity';
import { MaintenancePlanEntity } from './entities/maintenance-plan.entity';
import { MaintenanceWorkOrderEntity } from './entities/maintenance-work-order.entity';
import { MaintenanceManagementController } from './maintenance-management.controller';
import { MaintenanceManagementService } from './maintenance-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceAssetEntity,
      MaintenancePlanEntity,
      MaintenanceWorkOrderEntity,
      MaintenanceDowntimeEntity,
    ]),
  ],
  controllers: [MaintenanceManagementController],
  providers: [MaintenanceManagementService],
  exports: [MaintenanceManagementService],
})
export class MaintenanceManagementModule {}
