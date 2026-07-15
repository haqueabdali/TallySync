import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';

import { CustomerEntity } from './entities/customer.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      SalesOrderEntity,
      SalesOrderItemEntity,
      ItemEntity,
    ]),
  ],
})
export class SalesOrdersModule {}