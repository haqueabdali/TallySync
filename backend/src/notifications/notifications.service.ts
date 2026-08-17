import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { SendTemplateNotificationDto } from './dto/send-template-notification.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { UpsertNotificationPreferenceDto } from './dto/upsert-notification-preference.dto';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationChannel } from './enums/notification-channel.enum';
import { NotificationStatus } from './enums/notification-status.enum';
import type { NotificationChannelAdapter } from './interfaces/notification-channel-adapter.interface';

export interface NotificationListResult {
  data: NotificationEntity[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable()
export class NotificationsService {
  static readonly DELIVERY_JOB_TYPE = 'notifications.deliver';
  private readonly adapters = new Map<NotificationChannel, NotificationChannelAdapter>();

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepository: Repository<NotificationTemplateEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<NotificationPreferenceEntity>,
    private readonly backgroundJobsService: BackgroundJobsService,
  ) {}

  registerAdapter(channel: NotificationChannel, adapter: NotificationChannelAdapter): void {
    if (channel === NotificationChannel.IN_APP) {
      throw new BadRequestException('In-app delivery is handled internally');
    }
    if (this.adapters.has(channel)) {
      throw new ConflictException(`An adapter is already registered for ${channel}`);
    }
    this.adapters.set(channel, adapter);
  }

  unregisterAdapter(channel: NotificationChannel): void {
    this.adapters.delete(channel);
  }

  async createTemplate(companyId: string, userId: string, dto: CreateNotificationTemplateDto): Promise<NotificationTemplateEntity> {
    const entity = this.templateRepository.create({
      companyId,
      code: dto.code.trim(),
      channel: dto.channel,
      subjectTemplate: dto.subjectTemplate?.trim() || null,
      bodyTemplate: dto.bodyTemplate,
      isActive: dto.isActive ?? true,
      createdById: userId,
      updatedById: null,
    });
    try {
      return await this.templateRepository.save(entity);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A notification template already exists for this code and channel');
      }
      throw error;
    }
  }

  async updateTemplate(companyId: string, userId: string, id: string, dto: UpdateNotificationTemplateDto): Promise<NotificationTemplateEntity> {
    const template = await this.findTemplate(companyId, id);
    if (dto.code !== undefined) template.code = dto.code.trim();
    if (dto.channel !== undefined) template.channel = dto.channel;
    if (dto.subjectTemplate !== undefined) template.subjectTemplate = dto.subjectTemplate.trim() || null;
    if (dto.bodyTemplate !== undefined) template.bodyTemplate = dto.bodyTemplate;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    template.updatedById = userId;
    try {
      return await this.templateRepository.save(template);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A notification template already exists for this code and channel');
      }
      throw error;
    }
  }

  async findTemplates(companyId: string): Promise<NotificationTemplateEntity[]> {
    return this.templateRepository.find({
      where: { companyId },
      order: { code: 'ASC', channel: 'ASC' },
    });
  }

  async deleteTemplate(companyId: string, id: string): Promise<void> {
    const template = await this.findTemplate(companyId, id);
    await this.templateRepository.softRemove(template);
  }

  async create(companyId: string, userId: string | null, dto: CreateNotificationDto): Promise<NotificationEntity> {
    this.validateRecipient(dto.channel, dto.recipientUserId);
    if (dto.recipientUserId && !(await this.isChannelEnabled(companyId, dto.recipientUserId, dto.channel))) {
      throw new ConflictException(`The recipient has disabled ${dto.channel} notifications`);
    }

    const idempotencyKey = dto.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const existing = await this.notificationRepository.findOne({ where: { companyId, idempotencyKey } });
      if (existing) return existing;
    }

    const notification = this.notificationRepository.create({
      companyId,
      recipientUserId: dto.recipientUserId ?? null,
      channel: dto.channel,
      recipient: dto.recipient.trim(),
      subject: dto.subject?.trim() || null,
      body: dto.body,
      metadata: dto.metadata ?? {},
      status: NotificationStatus.PENDING,
      idempotencyKey,
      providerMessageId: null,
      errorMessage: null,
      availableAt: dto.availableAt ? new Date(dto.availableAt) : new Date(),
      sentAt: null,
      readAt: null,
      createdById: userId,
    });

    try {
      const saved = await this.notificationRepository.save(notification);
      return await this.queue(saved);
    } catch (error: unknown) {
      if (idempotencyKey && this.isUniqueViolation(error)) {
        const existing = await this.notificationRepository.findOne({ where: { companyId, idempotencyKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async sendFromTemplate(companyId: string, userId: string | null, dto: SendTemplateNotificationDto): Promise<NotificationEntity> {
    const template = await this.templateRepository.findOne({
      where: { companyId, code: dto.templateCode.trim(), channel: dto.channel, isActive: true },
      order: { createdAt: 'DESC' },
    });
    if (!template) {
      throw new NotFoundException('Active notification template not found');
    }
    return this.create(companyId, userId, {
      channel: template.channel,
      recipientUserId: dto.recipientUserId,
      recipient: dto.recipient,
      subject: template.subjectTemplate ? this.render(template.subjectTemplate, dto.variables) : undefined,
      body: this.render(template.bodyTemplate, dto.variables),
      metadata: dto.metadata,
      idempotencyKey: dto.idempotencyKey,
      availableAt: dto.availableAt,
    });
  }

  async findAll(companyId: string, query: NotificationQueryDto): Promise<NotificationListResult> {
    const qb = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.companyId = :companyId', { companyId });
    if (query.channel) qb.andWhere('notification.channel = :channel', { channel: query.channel });
    if (query.status) qb.andWhere('notification.status = :status', { status: query.status });
    if (query.recipientUserId) qb.andWhere('notification.recipientUserId = :recipientUserId', { recipientUserId: query.recipientUserId });
    if (query.unreadOnly) qb.andWhere('notification.readAt IS NULL');
    qb.orderBy('notification.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
  }

  async findOne(companyId: string, id: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({ where: { id, companyId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markRead(companyId: string, userId: string, id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(companyId, id);
    if (notification.recipientUserId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.channel !== NotificationChannel.IN_APP) {
      throw new ConflictException('Only in-app notifications can be marked as read');
    }
    notification.readAt ??= new Date();
    return this.notificationRepository.save(notification);
  }

  async cancel(companyId: string, id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(companyId, id);
    if (![NotificationStatus.PENDING, NotificationStatus.QUEUED, NotificationStatus.FAILED].includes(notification.status)) {
      throw new ConflictException(`A ${notification.status} notification cannot be cancelled`);
    }
    notification.status = NotificationStatus.CANCELLED;
    return this.notificationRepository.save(notification);
  }

  async retry(companyId: string, id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(companyId, id);
    if (notification.status !== NotificationStatus.FAILED) {
      throw new ConflictException('Only failed notifications can be retried');
    }
    notification.status = NotificationStatus.PENDING;
    notification.errorMessage = null;
    notification.availableAt = new Date();
    const saved = await this.notificationRepository.save(notification);
    return this.queue(saved, true);
  }

  async upsertPreference(companyId: string, userId: string, dto: UpsertNotificationPreferenceDto): Promise<NotificationPreferenceEntity> {
    let preference = await this.preferenceRepository.findOne({ where: { companyId, userId, channel: dto.channel } });
    if (!preference) {
      preference = this.preferenceRepository.create({ companyId, userId, channel: dto.channel, enabled: dto.enabled });
    } else {
      preference.enabled = dto.enabled;
    }
    return this.preferenceRepository.save(preference);
  }

  async getPreferences(companyId: string, userId: string): Promise<NotificationPreferenceEntity[]> {
    return this.preferenceRepository.find({ where: { companyId, userId }, order: { channel: 'ASC' } });
  }

  async deliver(notificationId: string, companyId: string): Promise<Record<string, unknown>> {
    const notification = await this.findOne(companyId, notificationId);
    if (notification.status === NotificationStatus.SENT) {
      return { notificationId, alreadySent: true };
    }
    if (notification.status === NotificationStatus.CANCELLED) {
      throw new ConflictException('Cancelled notification cannot be delivered');
    }
    try {
      if (notification.channel === NotificationChannel.IN_APP) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        notification.errorMessage = null;
        await this.notificationRepository.save(notification);
        return { notificationId, channel: notification.channel };
      }
      const adapter = this.adapters.get(notification.channel);
      if (!adapter) {
        throw new Error(`No notification adapter is registered for ${notification.channel}`);
      }
      const result = await adapter.send({
        notificationId: notification.id,
        companyId: notification.companyId,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        body: notification.body,
        metadata: notification.metadata,
      });
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      notification.providerMessageId = result.providerMessageId ?? null;
      notification.errorMessage = null;
      if (result.metadata) notification.metadata = { ...notification.metadata, provider: result.metadata };
      await this.notificationRepository.save(notification);
      return { notificationId, channel: notification.channel, providerMessageId: notification.providerMessageId };
    } catch (error: unknown) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = this.getErrorMessage(error).substring(0, 10000);
      await this.notificationRepository.save(notification);
      throw error;
    }
  }

  private async queue(notification: NotificationEntity, forceNewJob = false): Promise<NotificationEntity> {
    if (notification.channel === NotificationChannel.IN_APP && notification.availableAt <= new Date()) {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      return this.notificationRepository.save(notification);
    }
    const job = await this.backgroundJobsService.enqueue(notification.companyId, {
      type: NotificationsService.DELIVERY_JOB_TYPE,
      queue: 'notifications',
      payload: { notificationId: notification.id },
      maxAttempts: 5,
      priority: 0,
      availableAt: notification.availableAt.toISOString(),
      idempotencyKey: forceNewJob ? `notification:${notification.id}:${Date.now()}` : `notification:${notification.id}`,
    });
    notification.status = NotificationStatus.QUEUED;
    notification.metadata = { ...notification.metadata, backgroundJobId: job.id };
    return this.notificationRepository.save(notification);
  }

  private async findTemplate(companyId: string, id: string): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepository.findOne({ where: { id, companyId } });
    if (!template) throw new NotFoundException('Notification template not found');
    return template;
  }

  private async isChannelEnabled(companyId: string, userId: string, channel: NotificationChannel): Promise<boolean> {
    const preference = await this.preferenceRepository.findOne({ where: { companyId, userId, channel } });
    return preference?.enabled ?? true;
  }

  private validateRecipient(channel: NotificationChannel, recipientUserId?: string): void {
    if (channel === NotificationChannel.IN_APP && !recipientUserId) {
      throw new BadRequestException('recipientUserId is required for in-app notifications');
    }
  }

  private render(template: string, variables: Record<string, unknown>): string {
    return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match: string, key: string) => {
      const value = variables[key];
      if (value === undefined || value === null) {
        throw new BadRequestException(`Missing template variable: ${key}`);
      }
      return String(value);
    });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown notification delivery error';
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
  }
}
