import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { DeliveryNoteItemEntity } from '../delivery-notes/entities/delivery-note-item.entity';
import { DeliveryNoteEntity } from '../delivery-notes/entities/delivery-note.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { SalesInvoiceItemEntity } from './entities/sales-invoice-item.entity';
import { SalesInvoiceEntity } from './entities/sales-invoice.entity';
import { SalesInvoicesController } from './sales-invoices.controller';
import { SalesInvoicesService } from './sales-invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesInvoiceEntity,
      SalesInvoiceItemEntity,
      CustomerEntity,
      SalesOrderEntity,
      SalesOrderItemEntity,
      DeliveryNoteEntity,
      DeliveryNoteItemEntity,
      ItemEntity,
    ]),
  ],
  controllers: [SalesInvoicesController],
  providers: [SalesInvoicesService],
  exports: [SalesInvoicesService],
})
export class SalesInvoicesModule {}
