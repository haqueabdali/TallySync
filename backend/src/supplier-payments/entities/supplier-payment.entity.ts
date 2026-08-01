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

import { SupplierPaymentMethod } from '../enums/supplier-payment-method.enum';
import { SupplierPaymentStatus } from '../enums/supplier-payment-status.enum';
import { SupplierPaymentAllocation } from './supplier-payment-allocation.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },
  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('supplier_payments')
@Index('IDX_supplier_payments_company', ['companyId'])
@Index('IDX_supplier_payments_supplier', ['supplierId'])
@Index('IDX_supplier_payments_status', ['companyId', 'status'])
@Index('UQ_supplier_payments_company_number', ['companyId', 'paymentNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class SupplierPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @Column({ name: 'payment_number', type: 'varchar', length: 50 })
  paymentNumber!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: SupplierPaymentMethod,
  })
  paymentMethod!: SupplierPaymentMethod;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency!: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column({
    name: 'allocated_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  allocatedAmount!: number;

  @Column({
    name: 'unallocated_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  unallocatedAmount!: number;

  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true })
  referenceNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    type: 'enum',
    enum: SupplierPaymentStatus,
    default: SupplierPaymentStatus.Draft,
  })
  status!: SupplierPaymentStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @OneToMany(
    () => SupplierPaymentAllocation,
    (allocation) => allocation.supplierPayment,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  allocations!: SupplierPaymentAllocation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
