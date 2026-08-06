import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseReturn } from '../purchase-returns/entities/purchase-return.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierStatementsController } from './supplier-statements.controller';
import { SupplierStatementsService } from './supplier-statements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierEntity,
      PurchaseInvoiceEntity,
      SupplierPayment,
      PurchaseReturn,
    ]),
  ],
  controllers: [SupplierStatementsController],
  providers: [SupplierStatementsService],
  exports: [SupplierStatementsService],
})
export class SupplierStatementsModule {}
