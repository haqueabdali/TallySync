import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { InventoryAgingController } from './inventory-aging.controller';
import { InventoryAgingService } from './inventory-aging.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryCostTransactionEntity])],
  controllers: [InventoryAgingController],
  providers: [InventoryAgingService],
  exports: [InventoryAgingService],
})
export class InventoryAgingModule {}
