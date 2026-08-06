import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { AgedPayablesController } from './aged-payables.controller';
import { AgedPayablesService } from './aged-payables.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseInvoiceEntity])],
  controllers: [AgedPayablesController],
  providers: [AgedPayablesService],
  exports: [AgedPayablesService],
})
export class AgedPayablesModule {}
