import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationChannel } from '../notifications/enums/notification-channel.enum';
import { NotificationStatus } from '../notifications/enums/notification-status.enum';
import { ListCommercialNotificationsQueryDto } from './dto/list-commercial-notifications-query.dto';
import { LicenseEntity } from './entities/license.entity';
import { LicenseStatus } from './enums/license-status.enum';

export type CommercialNotificationEvent =
  | 'license.activated'
  | 'license.suspended'
  | 'license.revoked'
  | 'license.renewed'
  | 'license.expiring'
  | 'activation.authorized'
  | 'activation.revoked';

@Injectable()
export class CommercialNotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(LicenseEntity)
    private readonly licenseRepository: Repository<LicenseEntity>,
  ) {}

  async notifyCompanyAdmins(
    license: LicenseEntity,
    event: CommercialNotificationEvent,
    details: Record<string, unknown> = {},
    idempotencySuffix?: string,
  ): Promise<number> {
    const users = await this.userRepository.find({
      where: {
        companyId: license.companyId,
        status: UserStatus.ACTIVE,
        deletedAt: IsNull(),
      },
      relations: { role: true },
    });
    const admins = users.filter((user) => user.role?.name === 'admin');
    if (!admins.length) return 0;

    const now = new Date();
    let created = 0;
    for (const admin of admins) {
      const key = [
        'commercial',
        event,
        license.id,
        admin.id,
        idempotencySuffix || now.toISOString(),
      ].join(':');
      const existing = await this.notificationRepository.findOne({
        where: { companyId: license.companyId, idempotencyKey: key },
      });
      if (existing) continue;

      const content = this.contentFor(event, license, details);
      const notification = this.notificationRepository.create({
        companyId: license.companyId,
        recipientUserId: admin.id,
        channel: NotificationChannel.IN_APP,
        recipient: admin.email,
        subject: content.subject,
        body: content.body,
        metadata: {
          category: 'commercial',
          event,
          licenseId: license.id,
          licenseNumber: license.licenseNumber,
          ...details,
        },
        status: NotificationStatus.SENT,
        idempotencyKey: key,
        providerMessageId: null,
        errorMessage: null,
        availableAt: now,
        sentAt: now,
        readAt: null,
        createdById: null,
      });
      await this.notificationRepository.save(notification);
      created += 1;
    }
    return created;
  }

  async scanExpirationReminders(now = new Date()): Promise<{
    licensesScanned: number;
    notificationsCreated: number;
  }> {
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const licenses = await this.licenseRepository
      .createQueryBuilder('license')
      .leftJoinAndSelect('license.company', 'company')
      .where('license.deletedAt IS NULL')
      .andWhere('license.status IN (:...statuses)', {
        statuses: [LicenseStatus.ACTIVE, LicenseStatus.SUSPENDED],
      })
      .andWhere('license.expiresAt > :now', { now })
      .andWhere('license.expiresAt <= :horizon', { horizon })
      .orderBy('license.expiresAt', 'ASC')
      .getMany();

    let notificationsCreated = 0;
    for (const license of licenses) {
      if (!license.expiresAt) continue;
      const msRemaining = license.expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
      const threshold = daysRemaining <= 1 ? 1 : daysRemaining <= 7 ? 7 : 30;
      notificationsCreated += await this.notifyCompanyAdmins(
        license,
        'license.expiring',
        { expiresAt: license.expiresAt.toISOString(), daysRemaining, thresholdDays: threshold },
        `threshold-${threshold}:${license.expiresAt.toISOString()}`,
      );
    }

    return { licensesScanned: licenses.length, notificationsCreated };
  }

  async listForPlatform(query: ListCommercialNotificationsQueryDto): Promise<{
    data: NotificationEntity[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where("notification.metadata ->> 'category' = :category", { category: 'commercial' })
      .orderBy('notification.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.companyId) qb.andWhere('notification.companyId = :companyId', { companyId: query.companyId });
    if (query.event?.trim()) qb.andWhere("notification.metadata ->> 'event' = :event", { event: query.event.trim() });

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  private contentFor(
    event: CommercialNotificationEvent,
    license: LicenseEntity,
    details: Record<string, unknown>,
  ): { subject: string; body: string } {
    const number = license.licenseNumber;
    switch (event) {
      case 'license.activated':
        return { subject: 'TallySync license activated', body: `License ${number} has been activated.` };
      case 'license.suspended':
        return { subject: 'TallySync license suspended', body: `License ${number} has been suspended. Contact your TallySync administrator for assistance.` };
      case 'license.revoked':
        return { subject: 'TallySync license revoked', body: `License ${number} has been revoked and is no longer authorized.` };
      case 'license.renewed':
        return { subject: 'TallySync license renewed', body: `License ${number} has been renewed until ${String(details.expiresAt ?? 'the new expiration date')}.` };
      case 'license.expiring':
        return { subject: 'TallySync license expiration reminder', body: `License ${number} expires in ${String(details.daysRemaining ?? '?')} day(s). Please arrange renewal before expiration.` };
      case 'activation.authorized':
        return { subject: 'TallySync installation authorized', body: `A TallySync installation was authorized for license ${number}.` };
      case 'activation.revoked':
        return { subject: 'TallySync installation revoked', body: `A TallySync installation authorization was revoked for license ${number}.` };
    }
  }
}
