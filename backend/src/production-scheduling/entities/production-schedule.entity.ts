import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductionSchedulePriority } from '../enums/production-schedule-priority.enum';
import { ProductionScheduleStatus } from '../enums/production-schedule-status.enum';

@Entity('production_schedules')
@Index('IDX_production_schedules_company', ['companyId'])
@Index('IDX_production_schedules_order', ['companyId', 'productionOrderId'])
@Index('IDX_production_schedules_window', ['companyId', 'plannedStartAt', 'plannedEndAt'])
@Index('IDX_production_schedules_status', ['companyId', 'status'])
export class ProductionScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'production_order_id', type: 'uuid' })
  productionOrderId!: string;

  @Column({ name: 'schedule_number', type: 'varchar', length: 50 })
  scheduleNumber!: string;

  @Column({ name: 'planned_start_at', type: 'timestamptz' })
  plannedStartAt!: Date;

  @Column({ name: 'planned_end_at', type: 'timestamptz' })
  plannedEndAt!: Date;

  @Column({ name: 'actual_start_at', type: 'timestamptz', nullable: true })
  actualStartAt!: Date | null;

  @Column({ name: 'actual_end_at', type: 'timestamptz', nullable: true })
  actualEndAt!: Date | null;

  @Column({
    type: 'enum',
    enum: ProductionScheduleStatus,
    default: ProductionScheduleStatus.PLANNED,
  })
  status!: ProductionScheduleStatus;

  @Column({
    type: 'enum',
    enum: ProductionSchedulePriority,
    default: ProductionSchedulePriority.NORMAL,
  })
  priority!: ProductionSchedulePriority;

  @Column({ name: 'work_center_code', type: 'varchar', length: 100, nullable: true })
  workCenterCode!: string | null;

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

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
