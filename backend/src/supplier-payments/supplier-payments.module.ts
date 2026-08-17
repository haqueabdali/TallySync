import { Module } from '@nestjs/common';
import { AccountingEngineModule } from '../accounting-engine/accounting-engine.module';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

@Module({
  imports: [
    AccountingEngineModule,
    TypeOrmModule.forFeature([
      SupplierPayment,
      SupplierPaymentAllocation,
      SupplierEntity,
      PurchaseInvoiceEntity,
      AccountingSettingsEntity,
    ]),
  ],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
