import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
export class SupplierPaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supplier_payment_id', type: 'uuid' })
  supplierPaymentId!: string;

  @ManyToOne(
    () => SupplierPayment,
    (payment) => payment.allocations,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'supplier_payment_id' })
  supplierPayment!: SupplierPayment;

  @Column({ name: 'purchase_invoice_id', type: 'uuid' })
  purchaseInvoiceId!: string;

  @Column({
    name: 'allocated_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  allocatedAmount!: number;
}
