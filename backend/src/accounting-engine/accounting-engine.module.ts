import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesReturnEntity } from '../sales-returns/entities/sales-return.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { AccountingEngineController } from './accounting-engine.controller';
import { AccountingEngineService } from './accounting-engine.service';
import { CustomerPaymentPostingRule } from './posting-rules/customer-payment.rule';
import { PurchaseInvoicePostingRule } from './posting-rules/purchase-invoice.rule';
import { SalesInvoicePostingRule } from './posting-rules/sales-invoice.rule';
import { SalesReturnPostingRule } from './posting-rules/sales-return.rule';
import { SupplierPaymentPostingRule } from './posting-rules/supplier-payment.rule';
import { LandedCostPostingRule } from './posting-rules/landed-cost.rule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JournalEntryEntity,
      AccountEntity,
      AccountingSettingsEntity,
      SalesInvoiceEntity,
      CustomerPaymentEntity,
      SalesReturnEntity,
      SupplierPayment,
      PurchaseInvoiceEntity,
    ]),
    JournalEntriesModule,
  ],
  controllers: [AccountingEngineController],
  providers: [
    AccountingEngineService,
    SalesInvoicePostingRule,
    CustomerPaymentPostingRule,
    SalesReturnPostingRule,
    SupplierPaymentPostingRule,
    PurchaseInvoicePostingRule,
    LandedCostPostingRule,
  ],
  exports: [AccountingEngineService],
})
export class AccountingEngineModule {}
