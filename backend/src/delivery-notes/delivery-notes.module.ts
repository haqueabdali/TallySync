import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { DeliveryNoteItemEntity } from './entities/delivery-note-item.entity';
import { DeliveryNoteEntity } from './entities/delivery-note.entity';
import { DeliveryNotesController } from './delivery-notes.controller';
import { DeliveryNotesService } from './delivery-notes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryNoteEntity,
      DeliveryNoteItemEntity,
      SalesOrderEntity,
      SalesOrderItemEntity,
      CustomerEntity,
      WarehouseEntity,
      ItemEntity,
    ]),
  ],
  controllers: [DeliveryNotesController],
  providers: [DeliveryNotesService],
  exports: [DeliveryNotesService],
})
export class DeliveryNotesModule {}
