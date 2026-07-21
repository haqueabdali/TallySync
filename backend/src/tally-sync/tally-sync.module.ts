import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TallyMasterService } from './tally-master.service';
import { TallyXmlService } from './tally-xml.service';
import { TallyHttpService } from './tally-http.service';
import { TallyParserService } from './tally-parser.service';
import { TallyCacheService } from './tally-cache.service';
import { TallyHealthService } from './tally-health.service';
import { TallyRetryService } from './tally-retry.service';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { TallySyncController } from './tally-sync.controller';
import { TallySyncService } from './tally-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrderEntity,
    ]),
  ],
  controllers: [
    TallySyncController,
  ],
  providers: [
    TallySyncService,
    TallyMasterService,
    TallyXmlService,
    TallyHttpService,
    TallyParserService,
    TallyCacheService,
    TallyHealthService,
    TallyRetryService,
  ],
  exports: [
    TallyMasterService,
    TallyXmlService,
    TallyHttpService,
    TallyParserService,
    TallyCacheService,
    TallyHealthService,
    TallyRetryService,
    TallySyncService,
  ],
})
export class TallySyncModule {}