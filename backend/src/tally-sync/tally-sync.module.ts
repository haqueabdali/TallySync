import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { TallyAccountingSyncEntity } from './entities/tally-accounting-sync.entity';

import { TallySyncController } from './tally-sync.controller';
import { TallyMasterSyncController } from './tally-master-sync.controller';

import { TallySyncService } from './tally-sync.service';
import { TallyMasterService } from './tally-master.service';
import { TallySingleMasterSyncService } from './tally-single-master-sync.service';
import { TallyMasterPullService } from './tally-master-pull.service';
import { TallyXmlService } from './tally-xml.service';
import { TallyHttpService } from './tally-http.service';
import { TallyParserService } from './tally-parser.service';
import { TallyCacheService } from './tally-cache.service';
import { TallyHealthService } from './tally-health.service';
import { TallyRetryService } from './tally-retry.service';
import { TallyAccountingSyncService } from './tally-accounting-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrderEntity,
      CustomerEntity,
      ItemEntity,
      SalesInvoiceEntity,
      CustomerPaymentEntity,
      PurchaseInvoiceEntity,
      SupplierPayment,
      TallyAccountingSyncEntity,
    ]),
  ],

  controllers: [TallySyncController, TallyMasterSyncController],

  providers: [
    TallySyncService,
    TallyAccountingSyncService,
    TallyMasterService,
    TallySingleMasterSyncService,
    TallyMasterPullService,
    TallyXmlService,
    TallyHttpService,
    TallyParserService,
    TallyCacheService,
    TallyHealthService,
    TallyRetryService,
  ],

  exports: [
    TallyMasterService,
    TallySingleMasterSyncService,
    TallyMasterPullService,
    TallyXmlService,
    TallyHttpService,
    TallyParserService,
    TallyCacheService,
    TallyHealthService,
    TallyRetryService,
    TallySyncService,
    TallyAccountingSyncService,
  ],
})
export class TallySyncModule {}
