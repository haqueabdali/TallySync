import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCostBalanceEntity } from '../entities/inventory-cost-balance.entity';
import { InventoryCostTransactionEntity } from '../entities/inventory-cost-transaction.entity';
import { FifoCostAllocationEntity } from './entities/fifo-cost-allocation.entity';
import { FifoCostLayerEntity } from './entities/fifo-cost-layer.entity';
import { FifoAllocator } from './fifo-allocator';
import { FifoCostingService } from './fifo-costing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryCostBalanceEntity,
      InventoryCostTransactionEntity,
      FifoCostLayerEntity,
      FifoCostAllocationEntity,
    ]),
  ],
  providers: [FifoAllocator, FifoCostingService],
  exports: [FifoCostingService],
})
export class FifoCostingModule {}
