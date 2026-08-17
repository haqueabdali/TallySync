import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationJobRegistrar implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly backgroundJobsService: BackgroundJobsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.backgroundJobsService.registerHandler(
      NotificationsService.DELIVERY_JOB_TYPE,
      {
        execute: async (payload, context) => {
          const notificationId = payload.notificationId;
          if (typeof notificationId !== 'string') {
            throw new Error('notificationId must be a string');
          }
          return this.notificationsService.deliver(notificationId, context.companyId);
        },
      },
    );
  }

  onModuleDestroy(): void {
    this.backgroundJobsService.unregisterHandler(
      NotificationsService.DELIVERY_JOB_TYPE,
    );
  }
}
