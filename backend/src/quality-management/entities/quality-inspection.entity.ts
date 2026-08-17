import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { QualityInspectionSourceType } from '../enums/quality-inspection-source-type.enum';
import { QualityInspectionStatus } from '../enums/quality-inspection-status.enum';
import { QualityInspectionCheckEntity } from './quality-inspection-check.entity';

const quantityTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('quality_inspections')
@Index('UQ_quality_inspections_company_number', ['companyId', 'inspectionNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('IDX_quality_inspections_company_status', ['companyId', 'status'])
@Index('IDX_quality_inspections_source', [
  'companyId',
  'sourceType',
  'sourceId',
])
@Index('IDX_quality_inspections_date', ['companyId', 'inspectionDate'])
export class QualityInspectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    name: 'inspection_number',
    type: 'varchar',
    length: 50,
  })
  inspectionNumber!: string;

  @Column({ name: 'inspection_date', type: 'date' })
  inspectionDate!: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: QualityInspectionSourceType,
  })
  sourceType!: QualityInspectionSourceType;

  @Column({
    name: 'source_id',
    type: 'uuid',
    nullable: true,
  })
  sourceId!: string | null;

  @Column({
    name: 'item_id',
    type: 'uuid',
    nullable: true,
  })
  itemId!: string | null;

  @Column({
    name: 'warehouse_id',
    type: 'uuid',
    nullable: true,
  })
  warehouseId!: string | null;

  @Column({
    type: 'enum',
    enum: QualityInspectionStatus,
    default: QualityInspectionStatus.DRAFT,
  })
  status!: QualityInspectionStatus;

  @Column({
    name: 'inspected_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: quantityTransformer,
  })
  inspectedQuantity!: number;

  @Column({
    name: 'accepted_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: quantityTransformer,
  })
  acceptedQuantity!: number;

  @Column({
    name: 'rejected_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: quantityTransformer,
  })
  rejectedQuantity!: number;

  @Column({
    name: 'inspector_id',
    type: 'uuid',
    nullable: true,
  })
  inspectorId!: string | null;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  completedAt!: Date | null;

  @Column({
    name: 'failure_reason',
    type: 'text',
    nullable: true,
  })
  failureReason!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    name: 'created_by',
    type: 'uuid',
    nullable: true,
  })
  createdBy!: string | null;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @OneToMany(
    () => QualityInspectionCheckEntity,
    (check) => check.inspection,
    {
      cascade: false,
    },
  )
  checks!: QualityInspectionCheckEntity[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
