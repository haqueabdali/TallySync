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

import { MaintenanceWorkOrderStatus } from '../enums/maintenance-work-order-status.enum';
import { MaintenanceWorkOrderType } from '../enums/maintenance-work-order-type.enum';
import { MaintenanceAssetEntity } from './maintenance-asset.entity';

const moneyTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('maintenance_work_orders')
@Index('UQ_maintenance_work_orders_company_number', ['companyId', 'workOrderNumber'], {
  unique: true,
})
@Index('IDX_maintenance_work_orders_company_status', ['companyId', 'status'])
@Index('IDX_maintenance_work_orders_asset', ['companyId', 'assetId'])
export class MaintenanceWorkOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @ManyToOne(() => MaintenanceAssetEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'asset_id' })
  asset!: MaintenanceAssetEntity;

  @Column({ name: 'maintenance_plan_id', type: 'uuid', nullable: true })
  maintenancePlanId!: string | null;

  @Column({ name: 'work_order_number', type: 'varchar', length: 50 })
  workOrderNumber!: string;

  @Column({ type: 'enum', enum: MaintenanceWorkOrderType })
  type!: MaintenanceWorkOrderType;

  @Column({
    type: 'enum',
    enum: MaintenanceWorkOrderStatus,
    default: MaintenanceWorkOrderStatus.OPEN,
  })
  status!: MaintenanceWorkOrderStatus;

  @Column({ name: 'scheduled_start_at', type: 'timestamptz', nullable: true })
  scheduledStartAt!: Date | null;

  @Column({ name: 'scheduled_end_at', type: 'timestamptz', nullable: true })
  scheduledEndAt!: Date | null;

  @Column({ name: 'actual_start_at', type: 'timestamptz', nullable: true })
  actualStartAt!: Date | null;

  @Column({ name: 'actual_end_at', type: 'timestamptz', nullable: true })
  actualEndAt!: Date | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({
    name: 'labor_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  laborCost!: number;

  @Column({
    name: 'parts_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  partsCost!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
