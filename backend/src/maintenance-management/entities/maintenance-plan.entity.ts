import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MaintenancePlanFrequency } from '../enums/maintenance-plan-frequency.enum';
import { MaintenanceAssetEntity } from './maintenance-asset.entity';

@Entity('maintenance_plans')
@Index('IDX_maintenance_plans_company_asset', ['companyId', 'assetId'])
@Index('IDX_maintenance_plans_due', ['companyId', 'nextDueDate'])
export class MaintenancePlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @ManyToOne(() => MaintenanceAssetEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'asset_id' })
  asset!: MaintenanceAssetEntity;

  @Column({ name: 'plan_name', type: 'varchar', length: 200 })
  planName!: string;

  @Column({
    type: 'enum',
    enum: MaintenancePlanFrequency,
  })
  frequency!: MaintenancePlanFrequency;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'next_due_date', type: 'date' })
  nextDueDate!: string;

  @Column({ name: 'estimated_minutes', type: 'integer', default: 0 })
  estimatedMinutes!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
