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

import { QualityCheckResult } from '../enums/quality-check-result.enum';
import { QualityInspectionEntity } from './quality-inspection.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('quality_inspection_checks')
@Index('IDX_quality_inspection_checks_inspection', ['inspectionId'])
export class QualityInspectionCheckEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'inspection_id',
    type: 'uuid',
  })
  inspectionId!: string;

  @ManyToOne(
    () => QualityInspectionEntity,
    (inspection) => inspection.checks,
    {
      onDelete: 'CASCADE',
      nullable: false,
    },
  )
  @JoinColumn({ name: 'inspection_id' })
  inspection!: QualityInspectionEntity;

  @Column({
    name: 'check_name',
    type: 'varchar',
    length: 200,
  })
  checkName!: string;

  @Column({
    name: 'specification',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  specification!: string | null;

  @Column({
    name: 'minimum_value',
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  minimumValue!: number | null;

  @Column({
    name: 'maximum_value',
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  maximumValue!: number | null;

  @Column({
    name: 'actual_numeric_value',
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  actualNumericValue!: number | null;

  @Column({
    name: 'expected_text',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  expectedText!: string | null;

  @Column({
    name: 'actual_text',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  actualText!: string | null;

  @Column({
    type: 'enum',
    enum: QualityCheckResult,
    default: QualityCheckResult.PENDING,
  })
  result!: QualityCheckResult;

  @Column({
    name: 'is_mandatory',
    type: 'boolean',
    default: true,
  })
  isMandatory!: boolean;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

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
}
