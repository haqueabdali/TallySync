import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { SalesOrderEntity } from './sales-order.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_order_items')
@Index('IDX_sales_order_items_order', ['salesOrderId'])
@Index('IDX_sales_order_items_item', ['itemId'])
export class SalesOrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'sales_order_id',
    type: 'uuid',
  })
  salesOrderId!: string;

  @ManyToOne(
    () => SalesOrderEntity,
    (salesOrder) => salesOrder.items,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder!: SalesOrderEntity;

  @Column({
    name: 'item_id',
    type: 'uuid',
  })
  itemId!: string;

  @ManyToOne(() => ItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'item_id' })
  item!: ItemEntity;

  @Column({
    name: 'sales_quotation_item_id',
    type: 'uuid',
    nullable: true,
  })
  salesQuotationItemId!: string | null;

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
    name: 'delivered_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  deliveredQuantity!: number;

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
    name: 'line_discount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  lineDiscount!: number;

  @Column({
    name: 'line_tax',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  lineTax!: number;

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

export { SalesOrderItemEntity as SalesOrderItem };