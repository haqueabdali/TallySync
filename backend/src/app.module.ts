import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { TallySyncModule } from './tally-sync/tally-sync.module';

import { MobileModule } from './mobile/mobile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,

        host: configService.get<string>('DATABASE_HOST', 'localhost'),

        port: configService.get<number>('DATABASE_PORT', 5432),

        username: configService.get<string>('DATABASE_USER', 'postgres'),

        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),

        database: configService.get<string>('DATABASE_NAME', 'tallysync_db'),

        autoLoadEntities: true,

        synchronize: false,
          //configService.get<string>('NODE_ENV') !== 'production',

        logging:
          configService.get<string>('NODE_ENV') === 'development',

        ssl:
          configService.get<string>('DATABASE_SSL') === 'true'
            ? {
                rejectUnauthorized: false,
              }
            : false,
      }),
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 20,
        },
      ],
    }),

    AuthModule,
    UsersModule,
    InventoryModule,
    SalesOrdersModule,
    TallySyncModule,
    MobileModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}