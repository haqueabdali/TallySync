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

import { CostingAnalysisStatus } from '../enums/costing-analysis-status.enum';
import { ProductionCostMaterialLineEntity } from './production-cost-material-line.entity';

const numberTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('production_cost_analyses')
@Index(
  'UQ_production_cost_analyses_company_reference',
  ['companyId', 'productionReferenceId'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
@Index(
  'IDX_production_cost_analyses_company_status',
  ['companyId', 'status'],
)
@Index(
  'IDX_production_cost_analyses_date',
  ['companyId', 'analysisDate'],
)
export class ProductionCostAnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    name: 'production_reference_id',
    type: 'uuid',
  })
  productionReferenceId!: string;

  @Column({
    name: 'analysis_number',
    type: 'varchar',
    length: 50,
  })
  analysisNumber!: string;

  @Column({
    name: 'analysis_date',
    type: 'date',
  })
  analysisDate!: string;

  @Column({
    name: 'finished_item_id',
    type: 'uuid',
    nullable: true,
  })
  finishedItemId!: string | null;

  @Column({
    name: 'planned_output_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numberTransformer,
  })
  plannedOutputQuantity!: number;

  @Column({
    name: 'actual_output_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numberTransformer,
  })
  actualOutputQuantity!: number;

  @Column({
    name: 'standard_conversion_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  standardConversionCost!: number;

  @Column({
    name: 'actual_conversion_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  actualConversionCost!: number;

  @Column({
    name: 'standard_overhead_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  standardOverheadCost!: number;

  @Column({
    name: 'actual_overhead_cost',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  actualOverheadCost!: number;

  @Column({
    name: 'revenue_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numberTransformer,
  })
  revenueAmount!: number;

  @Column({
    type: 'enum',
    enum: CostingAnalysisStatus,
    default: CostingAnalysisStatus.DRAFT,
  })
  status!: CostingAnalysisStatus;

  @Column({
    name: 'finalized_at',
    type: 'timestamptz',
    nullable: true,
  })
  finalizedAt!: Date | null;

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
    () => ProductionCostMaterialLineEntity,
    (line) => line.analysis,
  )
  materialLines!: ProductionCostMaterialLineEntity[];

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
