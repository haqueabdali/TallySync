import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CompanyEntity } from '../../auth/entities/company.entity';
import { LicensePlan } from '../enums/license-plan.enum';
import { LicenseStatus } from '../enums/license-status.enum';
import { LicenseActivationEntity } from './license-activation.entity';
import { LicenseFeatureEntity } from './license-feature.entity';

@Entity('licenses')
@Index('IDX_licenses_company_status', ['companyId', 'status'])
export class LicenseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ name: 'license_number', type: 'varchar', length: 64, unique: true })
  licenseNumber: string;

  @Column({ type: 'enum', enum: LicensePlan, default: LicensePlan.CUSTOM })
  plan: LicensePlan;

  @Column({ type: 'enum', enum: LicenseStatus, default: LicenseStatus.DRAFT })
  status: LicenseStatus;

  @Column({ name: 'max_users', type: 'integer', default: 5 })
  maxUsers: number;

  @Column({
    name: 'max_concurrent_users',
    type: 'integer',
    nullable: true,
  })
  maxConcurrentUsers: number | null;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({
    name: 'minimum_version',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  minimumVersion: string | null;

  @Column({
    name: 'maximum_version',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  maximumVersion: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'certificate_payload', type: 'jsonb', nullable: true })
  certificatePayload: Record<string, unknown> | null;

  @Column({ name: 'certificate_signature', type: 'text', nullable: true })
  certificateSignature: string | null;

  @Column({
    name: 'certificate_payload_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  certificatePayloadHash: string | null;

  @Column({
    name: 'certificate_key_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  certificateKeyId: string | null;

  @Column({ name: 'certificate_issued_at', type: 'timestamptz', nullable: true })
  certificateIssuedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  @ManyToOne(() => CompanyEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @OneToMany(() => LicenseFeatureEntity, (feature) => feature.license)
  features: LicenseFeatureEntity[];

  @OneToMany(() => LicenseActivationEntity, (activation) => activation.license)
  activations: LicenseActivationEntity[];
}
