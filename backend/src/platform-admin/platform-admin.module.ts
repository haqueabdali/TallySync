import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { LicenseEntity } from '../licensing/entities/license.entity';
import { LicensingModule } from '../licensing/licensing.module';
import { PlatformCompaniesController } from './platform-companies.controller';
import { PlatformCompaniesService } from './platform-companies.service';

@Module({
  imports: [
    LicensingModule,
    TypeOrmModule.forFeature([CompanyEntity, UserEntity, LicenseEntity]),
  ],
  controllers: [PlatformCompaniesController],
  providers: [PlatformCompaniesService],
})
export class PlatformAdminModule {}
