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

import { SalesQuotationStatus } from '../enums/sales-quotation-status.enum';
import { SalesQuotationItem } from './sales-quotation-item.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('sales_quotations')
@Index('IDX_sales_quotations_company', ['companyId'])
@Index('IDX_sales_quotations_customer', ['customerId'])
@Index('IDX_sales_quotations_status', ['companyId', 'status'])
@Index(
  'UQ_sales_quotations_company_number',
  ['companyId', 'quotationNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class SalesQuotation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'quotation_number', type: 'varchar', length: 50 })
  quotationNumber!: string;

  @Column({ name: 'quotation_date', type: 'date' })
  quotationDate!: string;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

  @Column({
    type: 'enum',
    enum: SalesQuotationStatus,
    default: SalesQuotationStatus.Draft,
  })
  status!: SalesQuotationStatus;

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
    name: 'shipping_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  shippingTotal!: number;

  @Column({
    name: 'grand_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  grandTotal!: number;

  @Column({ name: 'customer_reference', type: 'varchar', length: 120, nullable: true })
  customerReference!: string | null;

  @Column({ type: 'text', nullable: true })
  terms!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @OneToMany(
    () => SalesQuotationItem,
    (item) => item.salesQuotation,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  items!: SalesQuotationItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
