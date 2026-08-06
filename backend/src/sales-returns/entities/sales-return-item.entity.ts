import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ItemEntity } from '../../inventory/entities/item.entity';
import { SalesInvoiceItemEntity } from '../../sales-invoices/entities/sales-invoice-item.entity';
import { SalesReturnEntity } from './sales-return.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_return_items')
@Index('IDX_sales_return_items_return', ['salesReturnId'])
@Index('IDX_sales_return_items_invoice_item', ['salesInvoiceItemId'])
@Index('IDX_sales_return_items_item', ['itemId'])
export class SalesReturnItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sales_return_id', type: 'uuid' })
  salesReturnId!: string;

  @ManyToOne(
    () => SalesReturnEntity,
    (salesReturn) => salesReturn.items,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'sales_return_id' })
  salesReturn!: SalesReturnEntity;

  @Column({ name: 'sales_invoice_item_id', type: 'uuid' })
  salesInvoiceItemId!: string;

  @ManyToOne(() => SalesInvoiceItemEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_invoice_item_id' })
  salesInvoiceItem!: SalesInvoiceItemEntity;

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
    name: 'invoiced_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  invoicedQuantity!: number;

  @Column({
    name: 'previously_returned_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    transformer: decimalTransformer,
  })
  previouslyReturnedQuantity!: number;

  @Column({
    name: 'return_quantity',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalTransformer,
  })
  returnQuantity!: number;

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

  @Column({
    type: 'text',
    nullable: true,
  })
  reason!: string | null;
}
