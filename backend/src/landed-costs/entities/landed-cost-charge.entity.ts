import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { LandedCostType } from '../enums/landed-cost-type.enum';
import type { LandedCostEntity } from './landed-cost.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('landed_cost_charges')
@Index('IDX_landed_cost_charges_landed_cost', ['landedCostId'])
export class LandedCostChargeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'landed_cost_id', type: 'uuid' })
  landedCostId!: string;

  @ManyToOne(
    'LandedCostEntity',
    'charges',
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'landed_cost_id' })
  landedCost!: LandedCostEntity;

  @Column({
    name: 'cost_type',
    type: 'enum',
    enum: LandedCostType,
  })
  costType!: LandedCostType;

  @Column({
    name: 'supplier_id',
    type: 'uuid',
    nullable: true,
  })
  supplierId!: string | null;

  @Column({
    name: 'reference_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  referenceNumber!: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;
}
