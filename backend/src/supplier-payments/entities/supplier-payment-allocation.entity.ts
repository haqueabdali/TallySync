import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PurchaseInvoiceEntity } from '../../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierPayment } from './supplier-payment.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('supplier_payment_allocations')
@Index('IDX_supplier_payment_allocations_payment', ['supplierPaymentId'])
@Index('IDX_supplier_payment_allocations_invoice', ['purchaseInvoiceId'])
@Index(
  'UQ_supplier_payment_allocation_payment_invoice',
  ['supplierPaymentId', 'purchaseInvoiceId'],
  { unique: true },
)
export class SupplierPaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supplier_payment_id', type: 'uuid' })
  supplierPaymentId!: string;

  @ManyToOne(
    () => SupplierPayment,
    (payment) => payment.allocations,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'supplier_payment_id' })
  supplierPayment!: SupplierPayment;

  @Column({ name: 'purchase_invoice_id', type: 'uuid' })
  purchaseInvoiceId!: string;

  @ManyToOne(() => PurchaseInvoiceEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'purchase_invoice_id' })
  purchaseInvoice!: PurchaseInvoiceEntity;

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
