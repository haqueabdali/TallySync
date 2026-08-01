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
import { DeliveryNoteEntity } from '../../delivery-notes/entities/delivery-note.entity';
import { SalesOrderEntity } from '../../sales-orders/entities/sales-order.entity';
import { SalesInvoiceStatus } from '../enums/sales-invoice-status.enum';
import { SalesInvoiceItemEntity } from './sales-invoice-item.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_invoices')
@Index('IDX_sales_invoices_company', ['companyId'])
@Index('IDX_sales_invoices_customer', ['customerId'])
@Index('IDX_sales_invoices_sales_order', ['salesOrderId'])
@Index('IDX_sales_invoices_delivery_note', ['deliveryNoteId'])
@Index('IDX_sales_invoices_status', ['companyId', 'status'])
@Index(
  'UQ_sales_invoices_company_number',
  ['companyId', 'invoiceNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class SalesInvoiceEntity {
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

  @Column({
    name: 'sales_order_id',
    type: 'uuid',
    nullable: true,
  })
  salesOrderId!: string | null;

  @ManyToOne(() => SalesOrderEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder!: SalesOrderEntity | null;

  @Column({
    name: 'delivery_note_id',
    type: 'uuid',
    nullable: true,
  })
  deliveryNoteId!: string | null;

  @ManyToOne(() => DeliveryNoteEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'delivery_note_id' })
  deliveryNote!: DeliveryNoteEntity | null;

  @Column({
    name: 'invoice_number',
    type: 'varchar',
    length: 50,
  })
  invoiceNumber!: string;

  @Column({
    name: 'customer_invoice_reference',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  customerInvoiceReference!: string | null;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate!: string;

  @Column({
    name: 'due_date',
    type: 'date',
    nullable: true,
  })
  dueDate!: string | null;

  @Column({
    type: 'enum',
    enum: SalesInvoiceStatus,
    default: SalesInvoiceStatus.DRAFT,
  })
  status!: SalesInvoiceStatus;

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
    name: 'paid_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  paidAmount!: number;

  @Column({
    name: 'balance_due',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  balanceDue!: number;

  @Column({
    name: 'billing_address',
    type: 'text',
    nullable: true,
  })
  billingAddress!: string | null;

  @Column({
    name: 'shipping_address',
    type: 'text',
    nullable: true,
  })
  shippingAddress!: string | null;

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

  @OneToMany(
    () => SalesInvoiceItemEntity,
    (item) => item.salesInvoice,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: SalesInvoiceItemEntity[];

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
