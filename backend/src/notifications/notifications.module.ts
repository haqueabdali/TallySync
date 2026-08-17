import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackgroundJobsModule } from '../background-jobs/background-jobs.module';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationJobRegistrar } from './notification-job-registrar.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationTemplateEntity,
      NotificationPreferenceEntity,
    ]),
    BackgroundJobsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationJobRegistrar],
  exports: [NotificationsService],
})
export class NotificationsModule {}
