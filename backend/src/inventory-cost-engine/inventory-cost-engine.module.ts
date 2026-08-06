import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCostBalanceEntity } from './entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from './entities/inventory-cost-transaction.entity';
import { InventoryCostEngineController } from './inventory-cost-engine.controller';
import { InventoryCostEngineService } from './inventory-cost-engine.service';
@Module({
  imports: [TypeOrmModule.forFeature([InventoryCostBalanceEntity, InventoryCostTransactionEntity])],
  controllers: [InventoryCostEngineController], providers: [InventoryCostEngineService], exports: [InventoryCostEngineService],
})
export class InventoryCostEngineModule {}
