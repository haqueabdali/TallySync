import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PurchaseReturn } from './purchase-return.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('purchase_return_items')
@Index('IDX_purchase_return_items_return', ['purchaseReturnId'])
@Index('IDX_purchase_return_items_item', ['itemId'])
export class PurchaseReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_return_id', type: 'uuid' })
  purchaseReturnId!: string;

  @ManyToOne(
    () => PurchaseReturn,
    (purchaseReturn) => purchaseReturn.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'purchase_return_id' })
  purchaseReturn!: PurchaseReturn;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ name: 'purchase_invoice_item_id', type: 'uuid', nullable: true })
  purchaseInvoiceItemId!: string | null;

  @Column({ name: 'goods_receipt_item_id', type: 'uuid', nullable: true })
  goodsReceiptItemId!: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  description!: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  quantity!: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  unitPrice!: number;

  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 7,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  discountPercent!: number;

  @Column({
    name: 'tax_percent',
    type: 'decimal',
    precision: 7,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  taxPercent!: number;

  @Column({
    name: 'line_subtotal',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  lineSubtotal!: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discountAmount!: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  taxAmount!: number;

  @Column({
    name: 'line_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  lineTotal!: number;
}
