import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCostBalanceEntity } from '../inventory-cost-engine/entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryValuationController } from './inventory-valuation.controller';
import { InventoryValuationService } from './inventory-valuation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryCostBalanceEntity,
      InventoryCostTransactionEntity,
    ]),
  ],
  controllers: [InventoryValuationController],
  providers: [InventoryValuationService],
  exports: [InventoryValuationService],
})
export class InventoryValuationModule {}
