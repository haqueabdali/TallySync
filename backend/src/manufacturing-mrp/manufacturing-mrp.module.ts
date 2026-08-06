import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCostBalanceEntity } from '../inventory-cost-engine/entities/inventory-cost-balance.entity';
import { ManufacturingMrpController } from './manufacturing-mrp.controller';
import { ManufacturingMrpService } from './manufacturing-mrp.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryCostBalanceEntity])],
  controllers: [ManufacturingMrpController],
  providers: [ManufacturingMrpService],
  exports: [ManufacturingMrpService],
})
export class ManufacturingMrpModule {}
