import { Module } from '@nestjs/common';
import { MovingAverageCalculator } from './moving-average-calculator';
import { MovingAverageCostingService } from './moving-average-costing.service';

@Module({
  providers: [MovingAverageCalculator, MovingAverageCostingService],
  exports: [MovingAverageCostingService],
})
export class MovingAverageCostingModule {}
