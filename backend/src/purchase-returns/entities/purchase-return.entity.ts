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

import { PurchaseReturnStatus } from '../enums/purchase-return-status.enum';
import { PurchaseReturnItem } from './purchase-return-item.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('purchase_returns')
@Index('IDX_purchase_returns_company', ['companyId'])
@Index('IDX_purchase_returns_supplier', ['supplierId'])
@Index('IDX_purchase_returns_warehouse', ['warehouseId'])
@Index('IDX_purchase_returns_purchase_invoice', ['purchaseInvoiceId'])
@Index('UQ_purchase_returns_company_number', ['companyId', 'returnNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class PurchaseReturn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Column({ name: 'purchase_invoice_id', type: 'uuid', nullable: true })
  purchaseInvoiceId!: string | null;

  @Column({ name: 'goods_receipt_id', type: 'uuid', nullable: true })
  goodsReceiptId!: string | null;

  @Column({ name: 'return_number', type: 'varchar', length: 50 })
  returnNumber!: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate!: string;

  @Column({
    type: 'enum',
    enum: PurchaseReturnStatus,
    default: PurchaseReturnStatus.Draft,
  })
  status!: PurchaseReturnStatus;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
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

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @OneToMany(
    () => PurchaseReturnItem,
    (item) => item.purchaseReturn,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: PurchaseReturnItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
