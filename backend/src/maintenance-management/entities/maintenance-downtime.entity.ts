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

import { MaintenanceAssetEntity } from './maintenance-asset.entity';

@Entity('maintenance_downtime_logs')
@Index('IDX_maintenance_downtime_company_asset', ['companyId', 'assetId'])
@Index('IDX_maintenance_downtime_period', ['companyId', 'startedAt', 'endedAt'])
export class MaintenanceDowntimeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @ManyToOne(() => MaintenanceAssetEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'asset_id' })
  asset!: MaintenanceAssetEntity;

  @Column({ name: 'work_order_id', type: 'uuid', nullable: true })
  workOrderId!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
