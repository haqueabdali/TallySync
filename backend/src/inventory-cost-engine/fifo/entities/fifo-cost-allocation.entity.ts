import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  type ValueTransformer,
} from 'typeorm';
import { InventoryCostSourceType } from '../../enums/inventory-cost-source-type.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity('fifo_cost_allocations')
@Index('IDX_fifo_cost_allocations_issue', [
  'companyId',
  'issueSourceType',
  'issueSourceId',
  'issueSourceLineId',
])
@Index(
  'UQ_fifo_cost_allocations_issue_layer',
  [
    'companyId',
    'issueSourceType',
    'issueSourceId',
    'issueSourceLineId',
    'costLayerId',
  ],
  { unique: true },
)
export class FifoCostAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'cost_layer_id', type: 'uuid' })
  costLayerId!: string;

  @Column({
    name: 'issue_source_type',
    type: 'enum',
    enum: InventoryCostSourceType,
    enumName: 'inventory_cost_source_type_enum',
  })
  issueSourceType!: InventoryCostSourceType;

  @Column({ name: 'issue_source_id', type: 'uuid' })
  issueSourceId!: string;

  @Column({ name: 'issue_source_line_id', type: 'uuid' })
  issueSourceLineId!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericTransformer,
  })
  quantity!: number;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numericTransformer,
  })
  unitCost!: number;

  @Column({
    name: 'total_cost',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericTransformer,
  })
  totalCost!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
