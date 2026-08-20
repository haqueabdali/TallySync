import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { LicenseEntity } from '../licensing/entities/license.entity';
import { LicensingModule } from '../licensing/licensing.module';
<<<<<<< HEAD
import { UsersModule } from '../users/users.module';
import { PlatformCompaniesController } from './platform-companies.controller';
import { PlatformCompaniesService } from './platform-companies.service';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';
=======
import { PlatformCompaniesController } from './platform-companies.controller';
import { PlatformCompaniesService } from './platform-companies.service';
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500

@Module({
  imports: [
    LicensingModule,
<<<<<<< HEAD
    UsersModule,
    TypeOrmModule.forFeature([CompanyEntity, UserEntity, LicenseEntity]),
  ],
  controllers: [PlatformCompaniesController, PlatformUsersController],
  providers: [PlatformCompaniesService, PlatformUsersService],
=======
    TypeOrmModule.forFeature([CompanyEntity, UserEntity, LicenseEntity]),
  ],
  controllers: [PlatformCompaniesController],
  providers: [PlatformCompaniesService],
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
})
export class PlatformAdminModule {}
