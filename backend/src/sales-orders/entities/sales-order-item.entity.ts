import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { SalesOrderEntity } from './sales-order.entity';

@Entity('sales_order_items')
export class SalesOrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'sales_order_id',
    type: 'uuid',
  })
  @Index()
  salesOrderId: string;

  @Column({
    name: 'item_id',
    type: 'uuid',
  })
  @Index()
  itemId: string;

  @Column({
    name: 'item_name',
    type: 'varchar',
    length: 255,
  })
  itemName: string;

  @Column({
    name: 'sku',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  sku: string | null;

  @Column({
    name: 'quantity',
    type: 'numeric',
    precision: 15,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  quantity: number;

  @Column({
    name: 'unit',
    type: 'varchar',
    length: 32,
  })
  unit: string;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 15,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  unitPrice: number;

  @Column({
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  discountPercent: number;

  @Column({
    name: 'tax_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  taxPercent: number;

  @Column({
    name: 'line_subtotal',
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  lineSubtotal: number;

  @Column({
    name: 'line_discount',
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  lineDiscount: number;

  @Column({
    name: 'line_tax',
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  lineTax: number;

  @Column({
    name: 'line_total',
    type: 'numeric',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  lineTotal: number;

  @ManyToOne(() => SalesOrderEntity, (order: SalesOrderEntity) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrderEntity;

  @ManyToOne(() => ItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'item_id' })
  item: ItemEntity;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}
