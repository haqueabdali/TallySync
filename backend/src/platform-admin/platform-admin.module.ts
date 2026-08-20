import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { LicenseEntity } from '../licensing/entities/license.entity';
import { LicensingModule } from '../licensing/licensing.module';
import { UsersModule } from '../users/users.module';
import { PlatformCompaniesController } from './platform-companies.controller';
import { PlatformCompaniesService } from './platform-companies.service';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';

@Module({
  imports: [
    LicensingModule,
    UsersModule,
    TypeOrmModule.forFeature([CompanyEntity, UserEntity, LicenseEntity]),
  ],
  controllers: [PlatformCompaniesController, PlatformUsersController],
  providers: [PlatformCompaniesService, PlatformUsersService],
})
export class PlatformAdminModule {}
