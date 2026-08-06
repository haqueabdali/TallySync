import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SalesInvoiceEntity } from '../../sales-invoices/entities/sales-invoice.entity';
import { CustomerPaymentEntity } from './customer-payment.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('customer_payment_allocations')
@Index('IDX_customer_payment_allocations_payment', ['customerPaymentId'])
@Index('IDX_customer_payment_allocations_invoice', ['salesInvoiceId'])
@Index(
  'UQ_customer_payment_allocation_payment_invoice',
  ['customerPaymentId', 'salesInvoiceId'],
  { unique: true },
)
export class CustomerPaymentAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'customer_payment_id',
    type: 'uuid',
  })
  customerPaymentId!: string;

  @ManyToOne(
    () => CustomerPaymentEntity,
    (payment) => payment.allocations,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'customer_payment_id' })
  customerPayment!: CustomerPaymentEntity;

  @Column({
    name: 'sales_invoice_id',
    type: 'uuid',
  })
  salesInvoiceId!: string;

  @ManyToOne(() => SalesInvoiceEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sales_invoice_id' })
  salesInvoice!: SalesInvoiceEntity;

  @Column({
    name: 'allocated_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  allocatedAmount!: number;

  @Column({
    name: 'invoice_balance_before',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  invoiceBalanceBefore!: number;

  @Column({
    name: 'invoice_balance_after',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  invoiceBalanceAfter!: number;
}
