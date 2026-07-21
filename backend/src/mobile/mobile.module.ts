import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { TallySyncModule } from '../tally-sync/tally-sync.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesOrderEntity]),
    TallySyncModule,
  ],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}
