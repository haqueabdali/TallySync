import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCostTransactionEntity } from '../inventory-cost-engine/entities/inventory-cost-transaction.entity';
import { StockLedgerController } from './stock-ledger.controller';
import { StockLedgerService } from './stock-ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryCostTransactionEntity])],
  controllers: [StockLedgerController],
  providers: [StockLedgerService],
  exports: [StockLedgerService],
})
export class StockLedgerModule {}
