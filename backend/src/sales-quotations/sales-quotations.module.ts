import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { SalesQuotationItem } from './entities/sales-quotation-item.entity';
import { SalesQuotation } from './entities/sales-quotation.entity';
import { SalesQuotationsController } from './sales-quotations.controller';
import { SalesQuotationsService } from './sales-quotations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesQuotation,
      SalesQuotationItem,
      CustomerEntity,
      ItemEntity,
    ]),
  ],
  controllers: [SalesQuotationsController],
  providers: [SalesQuotationsService],
  exports: [SalesQuotationsService],
})
export class SalesQuotationsModule {}