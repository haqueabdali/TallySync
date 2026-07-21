import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CustomerEntity } from './customer.entity';
import { SalesOrderItemEntity } from './sales-order-item.entity';

export enum SalesOrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
}

export enum SalesOrderSyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity('sales_orders')
@Index('uq_sales_orders_company_order_number', ['companyId', 'orderNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class SalesOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy: string;

  @Column({
    name: 'order_number',
    type: 'varchar',
    length: 64,
  })
  orderNumber: string;

  @Column({
    name: 'order_date',
    type: 'date',
  })
  orderDate: string;

  @Column({
    name: 'expected_delivery_date',
    type: 'date',
    nullable: true,
  })
  expectedDeliveryDate: string | null;

  @Column({
    type: 'enum',
    enum: SalesOrderStatus,
    enumName: 'sales_order_status_enum',
    default: SalesOrderStatus.DRAFT,
  })
  status: SalesOrderStatus;

  @Column({
    name: 'subtotal',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  subtotal: number;

  @Column({
    name: 'tax_total',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  taxTotal: number;

  @Column({
    name: 'discount_total',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  discountTotal: number;

  @Column({
    name: 'grand_total',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  grandTotal: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @Column({
    name: 'approval_required',
    type: 'boolean',
    default: false,
  })
  approvalRequired: boolean;

  @Column({
    name: 'approved_by',
    type: 'uuid',
    nullable: true,
  })
  approvedBy: string | null;

  @Column({
    name: 'approved_at',
    type: 'timestamptz',
    nullable: true,
  })
  approvedAt: Date | null;

  @Column({
    name: 'rejection_reason',
    type: 'text',
    nullable: true,
  })
  rejectionReason: string | null;

  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: SalesOrderSyncStatus,
    enumName: 'sales_order_sync_status_enum',
    default: SalesOrderSyncStatus.PENDING,
  })
  syncStatus: SalesOrderSyncStatus;

  @Column({
    name: 'tally_voucher_id',
    type: 'bigint',
    nullable: true,
  })
  tallyVoucherId: string | null;

  @Column({
    name: 'tally_voucher_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  tallyVoucherNumber: string | null;

  @Column({
    name: 'tally_sync_error',
    type: 'text',
    nullable: true,
  })
  tallySyncError: string | null;

  @Column({
    name: 'tally_sync_attempts',
    type: 'integer',
    default: 0,
  })
  tallySyncAttempts: number;

  @Column({
    name: 'last_synced_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSyncedAt: Date | null;

  @ManyToOne(
    () => CustomerEntity,
    (customer: CustomerEntity) => customer.salesOrders,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @OneToMany(
    () => SalesOrderItemEntity,
    (item: SalesOrderItemEntity) => item.salesOrder,
    {
      cascade: true,
    },
  )
  items: SalesOrderItemEntity[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;
}