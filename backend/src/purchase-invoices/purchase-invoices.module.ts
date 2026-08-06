import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { PurchaseOrderItemEntity } from '../purchase-orders/entities/purchase-order-item.entity';
import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { PurchaseInvoiceEntity } from './entities/purchase-invoice.entity';
import { PurchaseInvoiceItemEntity } from './entities/purchase-invoice-item.entity';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { PurchaseInvoicesController } from './purchase-invoices.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseInvoiceEntity,
      PurchaseInvoiceItemEntity,
      SupplierEntity,
      PurchaseOrderEntity,
      PurchaseOrderItemEntity,
      GoodsReceipt,
      GoodsReceiptItem,
      ItemEntity,
    ]),
  ],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
