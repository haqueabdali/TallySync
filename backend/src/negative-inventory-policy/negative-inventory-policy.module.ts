import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../inventory/entities/item.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { NegativeInventoryPolicyEntity } from './entities/negative-inventory-policy.entity';
import { NegativeInventoryPolicyController } from './negative-inventory-policy.controller';
import { NegativeInventoryPolicyService } from './negative-inventory-policy.service';

@Module({
  imports: [TypeOrmModule.forFeature([NegativeInventoryPolicyEntity, ItemEntity, WarehouseEntity])],
  controllers: [NegativeInventoryPolicyController],
  providers: [NegativeInventoryPolicyService],
  exports: [NegativeInventoryPolicyService],
})
export class NegativeInventoryPolicyModule {}
