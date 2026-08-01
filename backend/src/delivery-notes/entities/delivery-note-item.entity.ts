import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../../sales-orders/entities/sales-order-item.entity';
import { DeliveryNoteEntity } from './delivery-note.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('delivery_note_items')
@Index('IDX_delivery_note_items_note', ['deliveryNoteId'])
@Index('IDX_delivery_note_items_sales_order_item', ['salesOrderItemId'])
@Index('IDX_delivery_note_items_item', ['itemId'])
export class DeliveryNoteItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'delivery_note_id', type: 'uuid' })
  deliveryNoteId!: string;

  @ManyToOne(
    () => DeliveryNoteEntity,
    (deliveryNote) => deliveryNote.items,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'delivery_note_id' })
  deliveryNote!: DeliveryNoteEntity;

  @Column({ name: 'sales_order_item_id', type: 'uuid' })
  salesOrderItemId!: string;

  @ManyToOne(() => SalesOrderItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_order_item_id' })
  salesOrderItem!: SalesOrderItemEntity;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

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
    name: 'ordered_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  orderedQuantity!: number;

  @Column({
    name: 'previously_delivered_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  previouslyDeliveredQuantity!: number;

  @Column({
    name: 'delivered_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  deliveredQuantity!: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  unitPrice!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;
}
