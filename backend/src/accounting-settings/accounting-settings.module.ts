import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountingSettingsEntity } from './entities/accounting-settings.entity';
import { AccountingSettingsController } from './accounting-settings.controller';
import { AccountingSettingsService } from './accounting-settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingSettingsEntity,
      AccountEntity,
    ]),
  ],
  controllers: [AccountingSettingsController],
  providers: [AccountingSettingsService],
  exports: [AccountingSettingsService],
})
export class AccountingSettingsModule {}
