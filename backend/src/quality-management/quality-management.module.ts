import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QualityInspectionCheckEntity } from './entities/quality-inspection-check.entity';
import { QualityInspectionEntity } from './entities/quality-inspection.entity';
import { QualityManagementController } from './quality-management.controller';
import { QualityManagementService } from './quality-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QualityInspectionEntity,
      QualityInspectionCheckEntity,
    ]),
  ],
  controllers: [
    QualityManagementController,
  ],
  providers: [
    QualityManagementService,
  ],
  exports: [
    QualityManagementService,
  ],
})
export class QualityManagementModule {}
