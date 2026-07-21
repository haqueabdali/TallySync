import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TallyMasterService } from './tally-master.service';
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
  ],
  exports: [
    TallyMasterService,
    TallySyncService,
  ],
})
export class TallySyncModule {}