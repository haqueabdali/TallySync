import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';
import { InventoryCostSourceType } from '../../enums/inventory-cost-source-type.enum';

const numericTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity('fifo_cost_layers')
@Index('IDX_fifo_cost_layers_lookup', [
  'companyId',
  'itemId',
  'warehouseId',
  'remainingQuantity',
  'receivedDate',
])
@Index(
  'UQ_fifo_cost_layers_source_line',
  ['companyId', 'sourceType', 'sourceId', 'sourceLineId'],
  { unique: true },
)
export class FifoCostLayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate!: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: InventoryCostSourceType,
    enumName: 'inventory_cost_source_type_enum',
  })
  sourceType!: InventoryCostSourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @Column({ name: 'source_line_id', type: 'uuid' })
  sourceLineId!: string;

  @Column({
    name: 'original_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericTransformer,
  })
  originalQuantity!: number;

  @Column({
    name: 'remaining_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericTransformer,
  })
  remainingQuantity!: number;

  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 18,
    scale: 6,
    transformer: numericTransformer,
  })
  unitCost!: number;

  @Column({
    name: 'original_value',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericTransformer,
  })
  originalValue!: number;

  @Column({
    name: 'remaining_value',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: numericTransformer,
  })
  remainingValue!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
