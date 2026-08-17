import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryRevaluationEntity } from './entities/inventory-revaluation.entity';
import { InventoryRevaluationLineEntity } from './entities/inventory-revaluation-line.entity';
import { InventoryRevaluationController } from './inventory-revaluation.controller';
import { InventoryRevaluationService } from './inventory-revaluation.service';
@Module({ imports: [TypeOrmModule.forFeature([InventoryRevaluationEntity, InventoryRevaluationLineEntity])], controllers: [InventoryRevaluationController], providers: [InventoryRevaluationService], exports: [InventoryRevaluationService] })
export class InventoryRevaluationModule {}
