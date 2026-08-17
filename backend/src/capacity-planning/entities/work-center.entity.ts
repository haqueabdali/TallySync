import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('work_centers')
@Index('UQ_work_centers_company_code', ['companyId', 'code'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('IDX_work_centers_company_active', ['companyId', 'isActive'])
export class WorkCenterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({
    name: 'daily_capacity_minutes',
    type: 'integer',
  })
  dailyCapacityMinutes!: number;

  @Column({
    name: 'efficiency_percent',
    type: 'numeric',
    precision: 7,
    scale: 2,
    default: 100,
    transformer: {
      to: (value: number): number => value,
      from: (value: string): number => Number(value),
    },
  })
  efficiencyPercent!: number;

  @Column({
    name: 'working_days',
    type: 'jsonb',
    default: () => "'[1,2,3,4,5]'::jsonb",
  })
  workingDays!: number[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
