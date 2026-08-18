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

import { LicensedFeature } from '../enums/licensed-feature.enum';
import { LicenseEntity } from './license.entity';

@Entity('license_features')
@Index('UQ_license_features_license_feature', ['licenseId', 'feature'], {
  unique: true,
})
export class LicenseFeatureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'license_id', type: 'uuid' })
  @Index()
  licenseId: string;

  @Column({ type: 'enum', enum: LicensedFeature })
  feature: LicensedFeature;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'feature_limit', type: 'integer', nullable: true })
  featureLimit: number | null;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => LicenseEntity, (license) => license.features, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'license_id' })
  license: LicenseEntity;
}
