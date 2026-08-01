import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';

import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';

import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { ItemEntity } from '../items/entities/item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
    GoodsReceipt,
    GoodsReceiptItem,
    PurchaseOrderEntity,
    WarehouseEntity,
    ItemEntity,
    
]),
  ],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}