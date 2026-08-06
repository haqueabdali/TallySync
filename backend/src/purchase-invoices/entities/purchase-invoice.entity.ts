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

import { GoodsReceipt } from '../../goods-receipts/entities/goods-receipt.entity';
import { PurchaseOrderEntity } from '../../purchase-orders/entities/purchase-order.entity';
import { SupplierEntity } from '../../suppliers/entities/supplier.entity';
import { PurchaseInvoiceStatus } from '../enums/purchase-invoice-status.enum';
import { PurchaseInvoiceItemEntity } from './purchase-invoice-item.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('purchase_invoices')
@Index('IDX_purchase_invoices_company', ['companyId'])
@Index('IDX_purchase_invoices_supplier', ['supplierId'])
@Index('IDX_purchase_invoices_purchase_order', ['purchaseOrderId'])
@Index('IDX_purchase_invoices_goods_receipt', ['goodsReceiptId'])
@Index('IDX_purchase_invoices_status', ['companyId', 'status'])
@Index(
  'UQ_purchase_invoices_company_number',
  ['companyId', 'invoiceNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class PurchaseInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => SupplierEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: SupplierEntity;

  @Column({
    name: 'purchase_order_id',
    type: 'uuid',
    nullable: true,
  })
  purchaseOrderId!: string | null;

  @ManyToOne(() => PurchaseOrderEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder!: PurchaseOrderEntity | null;

  @Column({
    name: 'goods_receipt_id',
    type: 'uuid',
    nullable: true,
  })
  goodsReceiptId!: string | null;

  @ManyToOne(() => GoodsReceipt, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt!: GoodsReceipt | null;

  @Column({
    name: 'invoice_number',
    type: 'varchar',
    length: 50,
  })
  invoiceNumber!: string;

  @Column({
    name: 'supplier_invoice_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  supplierInvoiceNumber!: string | null;

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
    enum: PurchaseInvoiceStatus,
    default: PurchaseInvoiceStatus.Draft,
  })
  status!: PurchaseInvoiceStatus;

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

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedBy!: string | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt!: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @OneToMany(
    () => PurchaseInvoiceItemEntity,
    (item) => item.purchaseInvoice,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: PurchaseInvoiceItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
