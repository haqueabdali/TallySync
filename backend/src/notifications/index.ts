export { NotificationsModule } from './notifications.module';
export { NotificationsService } from './notifications.service';
export { NotificationEntity } from './entities/notification.entity';
export { NotificationTemplateEntity } from './entities/notification-template.entity';
export { NotificationPreferenceEntity } from './entities/notification-preference.entity';
export { NotificationChannel } from './enums/notification-channel.enum';
export { NotificationStatus } from './enums/notification-status.enum';
export type {
  NotificationChannelAdapter,
  NotificationDeliveryMessage,
  NotificationDeliveryResult,
} from './interfaces/notification-channel-adapter.interface';
