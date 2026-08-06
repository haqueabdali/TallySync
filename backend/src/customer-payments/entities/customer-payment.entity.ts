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

import { CustomerEntity } from '../../customers/entities/customer.entity';
import { CustomerPaymentMethod } from '../enums/customer-payment-method.enum';
import { CustomerPaymentStatus } from '../enums/customer-payment-status.enum';
import { CustomerPaymentAllocationEntity } from './customer-payment-allocation.entity';

const decimalTransformer = {
  to(value: number | null | undefined): number | null {
    return value ?? null;
  },

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Entity('customer_payments')
@Index('IDX_customer_payments_company', ['companyId'])
@Index('IDX_customer_payments_customer', ['customerId'])
@Index('IDX_customer_payments_status', ['companyId', 'status'])
@Index('IDX_customer_payments_payment_date', ['companyId', 'paymentDate'])
@Index(
  'UQ_customer_payments_company_number',
  ['companyId', 'paymentNumber'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class CustomerPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerEntity, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Column({
    name: 'payment_number',
    type: 'varchar',
    length: 50,
  })
  paymentNumber!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: CustomerPaymentMethod,
    default: CustomerPaymentMethod.CASH,
  })
  paymentMethod!: CustomerPaymentMethod;

  @Column({
    type: 'enum',
    enum: CustomerPaymentStatus,
    default: CustomerPaymentStatus.DRAFT,
  })
  status!: CustomerPaymentStatus;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
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

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @Column({
    name: 'created_by',
    type: 'uuid',
    nullable: true,
  })
  createdBy!: string | null;

  @Column({
    name: 'updated_by',
    type: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @Column({
    name: 'posted_by',
    type: 'uuid',
    nullable: true,
  })
  postedBy!: string | null;

  @Column({
    name: 'posted_at',
    type: 'timestamptz',
    nullable: true,
  })
  postedAt!: Date | null;

  @Column({
    name: 'reversed_by',
    type: 'uuid',
    nullable: true,
  })
  reversedBy!: string | null;

  @Column({
    name: 'reversed_at',
    type: 'timestamptz',
    nullable: true,
  })
  reversedAt!: Date | null;

  @Column({
    name: 'reversal_reason',
    type: 'text',
    nullable: true,
  })
  reversalReason!: string | null;

  @OneToMany(
    () => CustomerPaymentAllocationEntity,
    (allocation) => allocation.customerPayment,
    {
      cascade: ['insert', 'update'],
      eager: true,
    },
  )
  allocations!: CustomerPaymentAllocationEntity[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;
}
