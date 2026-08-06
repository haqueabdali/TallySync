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
import { SalesInvoiceEntity } from '../../sales-invoices/entities/sales-invoice.entity';
import { WarehouseEntity } from '../../warehouses/entities/warehouse.entity';
import { SalesReturnStatus } from '../enums/sales-return-status.enum';
import { SalesReturnItemEntity } from './sales-return-item.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_returns')
@Index('IDX_sales_returns_company', ['companyId'])
@Index('IDX_sales_returns_customer', ['customerId'])
@Index('IDX_sales_returns_warehouse', ['warehouseId'])
@Index('IDX_sales_returns_invoice', ['salesInvoiceId'])
@Index('IDX_sales_returns_status', ['companyId', 'status'])
@Index(
  'UQ_sales_returns_company_number',
  ['companyId', 'returnNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class SalesReturnEntity {
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

  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId!: string;

  @ManyToOne(() => SalesInvoiceEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_invoice_id' })
  salesInvoice!: SalesInvoiceEntity;

  @Column({
    name: 'return_number',
    type: 'varchar',
    length: 50,
  })
  returnNumber!: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate!: string;

  @Column({
    type: 'enum',
    enum: SalesReturnStatus,
    default: SalesReturnStatus.DRAFT,
  })
  status!: SalesReturnStatus;

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
    name: 'grand_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  grandTotal!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  reason!: string | null;

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
    name: 'reversed_by',
    type: 'uuid',
    nullable: true,
  })
  reversedBy!: string | null;

  @Column({
    name: 'reversed_at',
    type: 'timestamptz',
    nullable: true,
  })
  reversedAt!: Date | null;

  @Column({
    name: 'reversal_reason',
    type: 'text',
    nullable: true,
  })
  reversalReason!: string | null;

  @OneToMany(
    () => SalesReturnItemEntity,
    (item) => item.salesReturn,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: SalesReturnItemEntity[];

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
