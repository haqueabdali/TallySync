import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionScheduleEntity } from './entities/production-schedule.entity';
import { ProductionSchedulingController } from './production-scheduling.controller';
import { ProductionSchedulingService } from './production-scheduling.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionScheduleEntity])],
  controllers: [ProductionSchedulingController],
  providers: [ProductionSchedulingService],
  exports: [ProductionSchedulingService],
})
export class ProductionSchedulingModule {}
