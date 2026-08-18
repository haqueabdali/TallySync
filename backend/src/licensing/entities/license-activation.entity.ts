import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { LicenseActivationStatus } from '../enums/license-activation-status.enum';
import { LicenseEntity } from './license.entity';

@Entity('license_activations')
@Index('UQ_license_activations_installation', ['licenseId', 'installationId'], {
  unique: true,
})
export class LicenseActivationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'license_id', type: 'uuid' })
  @Index()
  licenseId: string;

  @Column({ name: 'installation_id', type: 'varchar', length: 128 })
  installationId: string;

  @Column({ name: 'fingerprint_hash', type: 'varchar', length: 128 })
  fingerprintHash: string;

  @Column({ name: 'app_version', type: 'varchar', length: 32 })
  appVersion: string;

  @Column({
    type: 'enum',
    enum: LicenseActivationStatus,
    default: LicenseActivationStatus.ACTIVE,
  })
  status: LicenseActivationStatus;

  @Column({ name: 'activated_at', type: 'timestamptz', default: () => 'now()' })
  activatedAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({
    name: 'activation_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  activationTokenHash: string | null;

  @Column({ name: 'last_ip_address', type: 'varchar', length: 64, nullable: true })
  lastIpAddress: string | null;

  @Column({ name: 'last_user_agent', type: 'varchar', length: 255, nullable: true })
  lastUserAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => LicenseEntity, (license) => license.activations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'license_id' })
  license: LicenseEntity;
}
