import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VatReturnEntity } from './entities/vat-return.entity';
import { VatReturnLineEntity } from './entities/vat-return-line.entity';
import { VatEngineController } from './vat-engine.controller';
import { VatEngineService } from './vat-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([VatReturnEntity, VatReturnLineEntity])],
  controllers: [VatEngineController],
  providers: [VatEngineService],
  exports: [VatEngineService],
})
export class VatEngineModule {}
