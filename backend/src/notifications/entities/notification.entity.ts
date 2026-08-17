import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';

@Entity('notifications')
@Index('IDX_notifications_company_recipient_created', ['companyId', 'recipientUserId', 'createdAt'])
@Index('IDX_notifications_status_available', ['status', 'availableAt'])
@Index('UQ_notifications_company_idempotency', ['companyId', 'idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  companyId!: string;

  @Column({ type: 'uuid', nullable: true })
  recipientUserId!: string | null;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: 'varchar', length: 500 })
  recipient!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status!: NotificationStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: 'varchar', length: 10000, nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  availableAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
