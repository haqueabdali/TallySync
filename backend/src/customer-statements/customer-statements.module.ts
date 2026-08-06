import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesReturnEntity } from '../sales-returns/entities/sales-return.entity';
import { CustomerStatementsController } from './customer-statements.controller';
import { CustomerStatementsService } from './customer-statements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      SalesInvoiceEntity,
      CustomerPaymentEntity,
      SalesReturnEntity,
    ]),
  ],
  controllers: [CustomerStatementsController],
  providers: [CustomerStatementsService],
  exports: [CustomerStatementsService],
})
export class CustomerStatementsModule {}
