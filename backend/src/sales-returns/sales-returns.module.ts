import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesInvoiceItemEntity } from '../sales-invoices/entities/sales-invoice-item.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { SalesReturnItemEntity } from './entities/sales-return-item.entity';
import { SalesReturnEntity } from './entities/sales-return.entity';
import { SalesReturnsController } from './sales-returns.controller';
import { SalesReturnsService } from './sales-returns.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesReturnEntity,
      SalesReturnItemEntity,
      SalesInvoiceEntity,
      SalesInvoiceItemEntity,
      CustomerEntity,
      WarehouseEntity,
      ItemEntity,
    ]),
  ],
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
  exports: [SalesReturnsService],
})
export class SalesReturnsModule {}
