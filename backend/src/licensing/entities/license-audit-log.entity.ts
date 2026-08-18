import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { LicenseEntity } from './license.entity';

@Entity('license_audit_logs')
@Index('IDX_license_audit_logs_license_created', ['licenseId', 'createdAt'])
export class LicenseAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'license_id', type: 'uuid' })
  @Index()
  licenseId: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => LicenseEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'license_id' })
  license: LicenseEntity;
}
