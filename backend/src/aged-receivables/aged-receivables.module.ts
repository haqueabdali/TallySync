import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { AgedReceivablesController } from './aged-receivables.controller';
import { AgedReceivablesService } from './aged-receivables.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesInvoiceEntity])],
  controllers: [AgedReceivablesController],
  providers: [AgedReceivablesService],
  exports: [AgedReceivablesService],
})
export class AgedReceivablesModule {}
