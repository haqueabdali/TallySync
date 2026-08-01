import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SalesQuotation } from './sales-quotation.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_quotation_items')
@Index('IDX_sales_quotation_items_quotation', ['salesQuotationId'])
@Index('IDX_sales_quotation_items_item', ['itemId'])
export class SalesQuotationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sales_quotation_id', type: 'uuid' })
  salesQuotationId!: string;

  @ManyToOne(
    () => SalesQuotation,
    (quotation) => quotation.items,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'sales_quotation_id' })
  salesQuotation!: SalesQuotation;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

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
