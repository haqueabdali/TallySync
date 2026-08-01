import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DeliveryNoteItemEntity } from '../../delivery-notes/entities/delivery-note-item.entity';
import { ItemEntity } from '../../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../../sales-orders/entities/sales-order-item.entity';
import { SalesInvoiceEntity } from './sales-invoice.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_invoice_items')
@Index('IDX_sales_invoice_items_invoice', ['salesInvoiceId'])
@Index('IDX_sales_invoice_items_item', ['itemId'])
@Index('IDX_sales_invoice_items_sales_order_item', ['salesOrderItemId'])
@Index('IDX_sales_invoice_items_delivery_note_item', ['deliveryNoteItemId'])
export class SalesInvoiceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId!: string;

  @ManyToOne(
    () => SalesInvoiceEntity,
    (invoice) => invoice.items,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'sales_invoice_id' })
  salesInvoice!: SalesInvoiceEntity;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({
    name: 'sales_order_item_id',
    type: 'uuid',
    nullable: true,
  })
  salesOrderItemId!: string | null;

  @ManyToOne(() => SalesOrderItemEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_order_item_id' })
  salesOrderItem!: SalesOrderItemEntity | null;

  @Column({
    name: 'delivery_note_item_id',
    type: 'uuid',
    nullable: true,
  })
  deliveryNoteItemId!: string | null;

  @ManyToOne(() => DeliveryNoteItemEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'delivery_note_item_id' })
  deliveryNoteItem!: DeliveryNoteItemEntity | null;

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
