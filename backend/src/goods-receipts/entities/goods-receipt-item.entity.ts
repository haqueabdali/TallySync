import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  ValueTransformer,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { GoodsReceipt } from './goods-receipt.entity';

const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null => value ?? null,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};

@Entity('goods_receipt_items')
@Index('IDX_goods_receipt_items_receipt', ['goodsReceiptId'])
@Index('IDX_goods_receipt_items_po_item', ['purchaseOrderItemId'])
@Index('IDX_goods_receipt_items_item', ['itemId'])
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'goods_receipt_id', type: 'uuid' })
  goodsReceiptId!: string;

  @ManyToOne(() => GoodsReceipt, (receipt) => receipt.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt!: GoodsReceipt;

  @Column({ name: 'purchase_order_item_id', type: 'uuid' })
  purchaseOrderItemId!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({
    name: 'ordered_qty',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  orderedQty!: number;

  @Column({
    name: 'received_qty',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  receivedQty!: number;

  @Column({
    name: 'accepted_qty',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  acceptedQty!: number;

  @Column({
    name: 'rejected_qty',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  rejectedQty!: number;

  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  unitCost!: number;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;
}