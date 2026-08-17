import { Module } from '@nestjs/common';
import { AccountingEngineModule } from '../accounting-engine/accounting-engine.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { CustomerPaymentAllocationEntity } from './entities/customer-payment-allocation.entity';
import { CustomerPaymentEntity } from './entities/customer-payment.entity';
import { CustomerPaymentsController } from './customer-payments.controller';
import { CustomerPaymentsService } from './customer-payments.service';

@Module({
  imports: [
    AccountingEngineModule,
    TypeOrmModule.forFeature([
      CustomerPaymentEntity,
      CustomerPaymentAllocationEntity,
      CustomerEntity,
      SalesInvoiceEntity,
    ]),
  ],
  controllers: [CustomerPaymentsController],
  providers: [CustomerPaymentsService],
  exports: [CustomerPaymentsService],
})
export class CustomerPaymentsModule {}
