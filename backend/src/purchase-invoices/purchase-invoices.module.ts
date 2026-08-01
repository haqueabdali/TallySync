import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { PurchaseInvoiceItem } from './entities/purchase-invoice-item.entity';
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseInvoice,
      PurchaseInvoiceItem,
      SupplierEntity,
      PurchaseOrderEntity,
      GoodsReceipt,
    ]),
  ],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
