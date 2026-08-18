import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { LicenseActivationEntity } from './entities/license-activation.entity';
import { LicenseAuditLogEntity } from './entities/license-audit-log.entity';
import { LicenseFeatureEntity } from './entities/license-feature.entity';
import { LicenseSessionEntity } from './entities/license-session.entity';
import { LicenseEntity } from './entities/license.entity';
import { LicenseFeatureGuard } from './guards/license-feature.guard';
import { LicenseRuntimeController } from './license-runtime.controller';
import { LicenseSigningService } from './license-signing.service';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { LicenseSessionService } from './license-session.service';
import { PlatformLicensingController } from './platform-licensing.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      LicenseEntity,
      LicenseFeatureEntity,
      LicenseActivationEntity,
      LicenseAuditLogEntity,
      LicenseSessionEntity,
      CompanyEntity,
      UserEntity,
    ]),
  ],
  controllers: [
    LicensingController,
    LicenseRuntimeController,
    PlatformLicensingController,
  ],
  providers: [
    LicensingService,
    LicenseSessionService,
    LicenseSigningService,
    LicenseFeatureGuard,
    PlatformAdminGuard,
  ],
  exports: [
    LicensingService,
    LicenseSessionService,
    LicenseSigningService,
    LicenseFeatureGuard,
    PlatformAdminGuard,
  ],
})
export class LicensingModule {}
