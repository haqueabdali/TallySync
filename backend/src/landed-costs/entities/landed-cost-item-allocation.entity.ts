import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { LandedCostEntity } from './landed-cost.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('landed_cost_item_allocations')
@Index(
  'IDX_landed_cost_item_allocations_landed_cost',
  ['landedCostId'],
)
@Index(
  'IDX_landed_cost_item_allocations_item',
  ['itemId'],
)
@Index(
  'UQ_landed_cost_item_allocation_source',
  ['landedCostId', 'goodsReceiptItemId'],
  { unique: true },
)
export class LandedCostItemAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'landed_cost_id', type: 'uuid' })
  landedCostId!: string;

  @ManyToOne(
    'LandedCostEntity',
    'itemAllocations',
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'landed_cost_id' })
  landedCost!: LandedCostEntity;

  @Column({
    name: 'goods_receipt_item_id',
    type: 'uuid',
  })
  goodsReceiptItemId!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  quantity!: number;

  @Column({
    name: 'base_value',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  baseValue!: number;

  @Column({
    name: 'weight_value',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  weightValue!: number;

  @Column({
    name: 'allocation_basis',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  allocationBasis!: number;

  @Column({
    name: 'allocated_cost',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  allocatedCost!: number;

  @Column({
    name: 'landed_unit_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  landedUnitCost!: number;
}
