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

import { CustomerEntity } from '../../customers/entities/customer.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { SalesOrderStatus } from '../enums/sales-order-status.enum';
import { SalesOrderItemEntity } from './sales-order-item.entity';


export { SalesOrderStatus } from '../enums/sales-order-status.enum';

export enum SalesOrderSyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',

  Pending = 'pending',
  Syncing = 'syncing',
  Synced = 'synced',
  Failed = 'failed',
}

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_orders')
@Index('IDX_sales_orders_company', ['companyId'])
@Index('IDX_sales_orders_customer', ['customerId'])
@Index('IDX_sales_orders_warehouse', ['warehouseId'])
@Index('IDX_sales_orders_quotation', ['salesQuotationId'])
@Index('IDX_sales_orders_status', ['companyId', 'status'])
@Index('IDX_sales_orders_sync_status', ['companyId', 'syncStatus'])
@Index('UQ_sales_orders_company_number', ['companyId', 'orderNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class SalesOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @ManyToOne(() => WarehouseEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse!: WarehouseEntity;

  @Column({
    name: 'sales_quotation_id',
    type: 'uuid',
    nullable: true,
  })
  salesQuotationId!: string | null;

  @Column({
    name: 'order_number',
    type: 'varchar',
    length: 50,
  })
  orderNumber!: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate!: string;

  @Column({
    name: 'expected_delivery_date',
    type: 'date',
    nullable: true,
  })
  expectedDeliveryDate!: string | null;

  @Column({
    type: 'enum',
    enum: SalesOrderStatus,
    default: SalesOrderStatus.DRAFT,
  })
  status!: SalesOrderStatus;

  @Column({
    name: 'approval_required',
    type: 'boolean',
    default: false,
  })
  approvalRequired!: boolean;

  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: SalesOrderSyncStatus,
    default: SalesOrderSyncStatus.PENDING,
  })
  syncStatus!: SalesOrderSyncStatus;

  @Column({
    name: 'tally_voucher_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  tallyVoucherId!: string | null;

  @Column({
    name: 'tally_voucher_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  tallyVoucherNumber!: string | null;

  @Column({
    name: 'tally_sync_error',
    type: 'text',
    nullable: true,
  })
  tallySyncError!: string | null;

  @Column({
    name: 'tally_sync_attempts',
    type: 'integer',
    default: 0,
  })
  tallySyncAttempts!: number;

  @Column({
    name: 'last_synced_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSyncedAt!: Date | null;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
  currency!: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  subtotal!: number;

  @Column({
    name: 'discount_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discountTotal!: number;

  @Column({
    name: 'tax_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  taxTotal!: number;

  @Column({
    name: 'shipping_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  shippingTotal!: number;

  @Column({
    name: 'grand_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  grandTotal!: number;

  @Column({
    name: 'customer_reference',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  customerReference!: string | null;

  @Column({
    name: 'shipping_address',
    type: 'text',
    nullable: true,
  })
  shippingAddress!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
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

  @Column({
    name: 'approved_by',
    type: 'uuid',
    nullable: true,
  })
  approvedBy!: string | null;

  @Column({
    name: 'approved_at',
    type: 'timestamptz',
    nullable: true,
  })
  approvedAt!: Date | null;

  @Column({
    name: 'rejection_reason',
    type: 'text',
    nullable: true,
  })
  rejectionReason!: string | null;

  @OneToMany(
    () => SalesOrderItemEntity,
    (item) => item.salesOrder,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: SalesOrderItemEntity[];

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