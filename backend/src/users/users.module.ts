import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { CompanyEntity } from '../auth/entities/company.entity';

import { AuditLogEntity } from './entities/audit-log.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      CompanyEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
