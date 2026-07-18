import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';

import { CustomerEntity } from './entities/customer.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';

import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      SalesOrderEntity,
      SalesOrderItemEntity,
      ItemEntity,
    ]),
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}