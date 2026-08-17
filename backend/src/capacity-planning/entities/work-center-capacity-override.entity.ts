import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('work_center_capacity_overrides')
@Index(
  'UQ_work_center_capacity_overrides_date',
  ['companyId', 'workCenterId', 'capacityDate'],
  { unique: true },
)
@Index(
  'IDX_work_center_capacity_overrides_company_date',
  ['companyId', 'capacityDate'],
)
export class WorkCenterCapacityOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'work_center_id', type: 'uuid' })
  workCenterId!: string;

  @Column({ name: 'capacity_date', type: 'date' })
  capacityDate!: string;

  @Column({
    name: 'available_minutes',
    type: 'integer',
  })
  availableMinutes!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
