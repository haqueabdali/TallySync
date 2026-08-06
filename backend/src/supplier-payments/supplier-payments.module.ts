import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierPayment,
      SupplierPaymentAllocation,
      SupplierEntity,
      PurchaseInvoiceEntity,
    ]),
  ],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
