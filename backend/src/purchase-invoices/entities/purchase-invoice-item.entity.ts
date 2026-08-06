import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { GoodsReceiptItem } from '../../goods-receipts/entities/goods-receipt-item.entity';
import { ItemEntity } from '../../inventory/entities/item.entity';
import { PurchaseInvoiceEntity } from './purchase-invoice.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('purchase_invoice_items')
@Index('IDX_purchase_invoice_items_invoice', ['purchaseInvoiceId'])
@Index('IDX_purchase_invoice_items_item', ['itemId'])
@Index('IDX_purchase_invoice_items_po_item', ['purchaseOrderItemId'])
@Index('IDX_purchase_invoice_items_grn_item', ['goodsReceiptItemId'])
export class PurchaseInvoiceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_invoice_id', type: 'uuid' })
  purchaseInvoiceId!: string;

  @ManyToOne(
    () => PurchaseInvoiceEntity,
    (invoice) => invoice.items,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'purchase_invoice_id' })
  purchaseInvoice!: PurchaseInvoiceEntity;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({
    name: 'purchase_order_item_id',
    type: 'uuid',
    nullable: true,
  })
  purchaseOrderItemId!: string | null;

  @Column({
    name: 'goods_receipt_item_id',
    type: 'uuid',
    nullable: true,
  })
  goodsReceiptItemId!: string | null;

  @ManyToOne(() => GoodsReceiptItem, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'goods_receipt_item_id' })
  goodsReceiptItem!: GoodsReceiptItem | null;

  @Column({
    name: 'item_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  itemName!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  sku!: string | null;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  unit!: string | null;

  @Column({
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  quantity!: number;

  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  unitCost!: number;

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