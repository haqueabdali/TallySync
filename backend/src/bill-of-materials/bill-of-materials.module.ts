import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';
import { BillOfMaterialsController } from './bill-of-materials.controller';
import { BillOfMaterialsService } from './bill-of-materials.service';
import { BillOfMaterialComponentEntity } from './entities/bill-of-material-component.entity';
import { BillOfMaterialEntity } from './entities/bill-of-material.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillOfMaterialEntity,
      BillOfMaterialComponentEntity,
      ItemEntity,
    ]),
  ],
  controllers: [BillOfMaterialsController],
  providers: [BillOfMaterialsService],
  exports: [BillOfMaterialsService],
})
export class BillOfMaterialsModule {}
