import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesQuotationItem } from '../sales-quotations/entities/sales-quotation-item.entity';
import { SalesQuotation } from '../sales-quotations/entities/sales-quotation.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrderEntity,
      SalesOrderItemEntity,
      CustomerEntity,
      WarehouseEntity,
      ItemEntity,
      SalesQuotation,
      SalesQuotationItem,

    ]),
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
