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

import { ProductionCostAnalysisEntity } from './production-cost-analysis.entity';

const numberTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('production_cost_material_lines')
@Index(
  'IDX_production_cost_material_lines_analysis',
  ['analysisId'],
)
@Index(
  'IDX_production_cost_material_lines_item',
  ['itemId'],
)
export class ProductionCostMaterialLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'analysis_id',
    type: 'uuid',
  })
  analysisId!: string;

  @ManyToOne(
    () => ProductionCostAnalysisEntity,
    (analysis) => analysis.materialLines,
    {
      onDelete: 'CASCADE',
      nullable: false,
    },
  )
  @JoinColumn({ name: 'analysis_id' })
  analysis!: ProductionCostAnalysisEntity;

  @Column({
    name: 'item_id',
    type: 'uuid',
  })
  itemId!: string;

  @Column({
    name: 'standard_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numberTransformer,
  })
  standardQuantity!: number;

  @Column({
    name: 'actual_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numberTransformer,
  })
  actualQuantity!: number;

  @Column({
    name: 'standard_unit_cost',
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numberTransformer,
  })
  standardUnitCost!: number;

  @Column({
    name: 'actual_unit_cost',
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numberTransformer,
  })
  actualUnitCost!: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  description!: string | null;

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
