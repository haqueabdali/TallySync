import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../auth/entities/user.entity';
import { LicenseEntity } from './license.entity';

@Entity('license_sessions')
@Index('IDX_license_sessions_company_activity', [
  'companyId',
  'isRevoked',
  'lastSeenAt',
])
@Index('IDX_license_sessions_user_activity', [
  'userId',
  'isRevoked',
  'lastSeenAt',
])
export class LicenseSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'license_id', type: 'uuid', nullable: true })
  @Index()
  licenseId: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  @Index()
  companyId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  @Index()
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => LicenseEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'license_id' })
  license: LicenseEntity | null;
}
