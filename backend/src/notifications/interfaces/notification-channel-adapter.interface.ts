import type { NotificationChannel } from '../enums/notification-channel.enum';

export interface NotificationDeliveryMessage {
  notificationId: string;
  companyId: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  metadata: Record<string, unknown>;
}

export interface NotificationDeliveryResult {
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannelAdapter {
  send(
    message: NotificationDeliveryMessage,
  ): Promise<NotificationDeliveryResult>;
}
