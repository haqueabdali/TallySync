import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Entity('notification_preferences')
@Index('UQ_notification_preferences_company_user_channel', ['companyId', 'userId', 'channel'], { unique: true })
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  companyId!: string;

  @Column('uuid')
  @Index()
  userId!: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
