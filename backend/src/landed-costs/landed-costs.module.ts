import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { LandedCostChargeEntity } from './entities/landed-cost-charge.entity';
import { LandedCostItemAllocationEntity } from './entities/landed-cost-item-allocation.entity';
import { LandedCostEntity } from './entities/landed-cost.entity';
import { LandedCostsController } from './landed-costs.controller';
import { LandedCostsService } from './landed-costs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LandedCostEntity,
      LandedCostChargeEntity,
      LandedCostItemAllocationEntity,
      GoodsReceipt,
      GoodsReceiptItem,
      PurchaseInvoiceEntity,
      SupplierEntity,
      ItemEntity,
    ]),
  ],
  controllers: [LandedCostsController],
  providers: [LandedCostsService],
  exports: [LandedCostsService],
})
export class LandedCostsModule {}
