import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CostingVarianceController } from './costing-variance.controller';
import { CostingVarianceService } from './costing-variance.service';
import { ProductionCostAnalysisEntity } from './entities/production-cost-analysis.entity';
import { ProductionCostMaterialLineEntity } from './entities/production-cost-material-line.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionCostAnalysisEntity,
      ProductionCostMaterialLineEntity,
    ]),
  ],
  controllers: [
    CostingVarianceController,
  ],
  providers: [
    CostingVarianceService,
  ],
  exports: [
    CostingVarianceService,
  ],
})
export class CostingVarianceModule {}
