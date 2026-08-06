import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { SupplierEntity } from '../../suppliers/entities/supplier.entity';
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
@Index('IDX_supplier_payments_date', ['companyId', 'paymentDate'])
@Index(
  'UQ_supplier_payments_company_number',
  ['companyId', 'paymentNumber'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class SupplierPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => SupplierEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: SupplierEntity;

  @Column({ name: 'payment_number', type: 'varchar', length: 50 })
  paymentNumber!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: SupplierPaymentMethod,
    default: SupplierPaymentMethod.BankTransfer,
  })
  paymentMethod!: SupplierPaymentMethod;

  @Column({
    type: 'enum',
    enum: SupplierPaymentStatus,
    default: SupplierPaymentStatus.Draft,
  })
  status!: SupplierPaymentStatus;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency!: string;

  @Column({
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

  @Column({
    name: 'reference_number',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  referenceNumber!: string | null;

  @Column({
    name: 'bank_account_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  bankAccountName!: string | null;

  @Column({
    name: 'cheque_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  chequeNumber!: string | null;

  @Column({
    name: 'cheque_date',
    type: 'date',
    nullable: true,
  })
  chequeDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(
    () => SupplierPaymentAllocation,
    (allocation) => allocation.supplierPayment,
    { cascade: ['insert', 'update'], eager: true },
  )
  allocations!: SupplierPaymentAllocation[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @Column({ name: 'posted_by', type: 'uuid', nullable: true })
  postedBy!: string | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt!: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
