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

import { LandedCostAllocationMethod } from '../enums/landed-cost-allocation-method.enum';
import { LandedCostStatus } from '../enums/landed-cost-status.enum';
import type { LandedCostChargeEntity } from './landed-cost-charge.entity';
import type { LandedCostItemAllocationEntity } from './landed-cost-item-allocation.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('landed_costs')
@Index('IDX_landed_costs_company', ['companyId'])
@Index('IDX_landed_costs_goods_receipt', ['goodsReceiptId'])
@Index('IDX_landed_costs_purchase_invoice', ['purchaseInvoiceId'])
@Index('IDX_landed_costs_status', ['companyId', 'status'])
@Index(
  'UQ_landed_costs_company_number',
  ['companyId', 'landedCostNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class LandedCostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    name: 'goods_receipt_id',
    type: 'uuid',
    nullable: true,
  })
  goodsReceiptId!: string | null;

  @Column({
    name: 'purchase_invoice_id',
    type: 'uuid',
    nullable: true,
  })
  purchaseInvoiceId!: string | null;

  @Column({
    name: 'landed_cost_number',
    type: 'varchar',
    length: 50,
  })
  landedCostNumber!: string;

  @Column({ name: 'cost_date', type: 'date' })
  costDate!: string;

  @Column({
    type: 'enum',
    enum: LandedCostStatus,
    default: LandedCostStatus.Draft,
  })
  status!: LandedCostStatus;

  @Column({
    name: 'allocation_method',
    type: 'enum',
    enum: LandedCostAllocationMethod,
    default: LandedCostAllocationMethod.ByValue,
  })
  allocationMethod!: LandedCostAllocationMethod;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
  currency!: string;

  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalCost!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(
    'LandedCostChargeEntity',
    'landedCost',
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  charges!: LandedCostChargeEntity[];

  @OneToMany(
    'LandedCostItemAllocationEntity',
    'landedCost',
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  itemAllocations!: LandedCostItemAllocationEntity[];

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

  @Column({
    name: 'posted_by',
    type: 'uuid',
    nullable: true,
  })
  postedBy!: string | null;

  @Column({
    name: 'posted_at',
    type: 'timestamptz',
    nullable: true,
  })
  postedAt!: Date | null;

  @Column({
    name: 'cancelled_by',
    type: 'uuid',
    nullable: true,
  })
  cancelledBy!: string | null;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancelledAt!: Date | null;

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
