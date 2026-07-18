import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { TallySyncController } from './tally-sync.controller';
import { TallySyncService } from './tally-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesOrderEntity]),
  ],
  controllers: [TallySyncController],
  providers: [TallySyncService],
  exports: [TallySyncService],
})
export class TallySyncModule {}