import 'dotenv/config';
import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { RoleEntity } from '../auth/entities/role.entity';
import { CompanyEntity } from '../auth/entities/company.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

import { AuditLogEntity } from '../users/entities/audit-log.entity';

import { CategoryEntity } from '../inventory/entities/category.entity';
import { ItemEntity } from '../inventory/entities/item.entity';

import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';

export default new DataSource({
  type: 'postgres',

  host: process.env.DATABASE_HOST ?? 'localhost',

  port: Number(process.env.DATABASE_PORT ?? 5432),

  username: process.env.DATABASE_USER ?? 'postgres',

  password: process.env.DATABASE_PASSWORD,

  database: process.env.DATABASE_NAME ?? 'tallysync_db',

  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,

  synchronize: false,

  logging: process.env.NODE_ENV === 'development',

  entities: [
    RoleEntity,
    CompanyEntity,
    UserEntity,
    RefreshTokenEntity,
    AuditLogEntity,
    CategoryEntity,
    ItemEntity,
    CustomerEntity,
    SalesOrderEntity,
    SalesOrderItemEntity,
  ],

  migrations: [`${__dirname}/migrations/*{.ts,.js}`],

  migrationsTableName: 'typeorm_migrations',
});
