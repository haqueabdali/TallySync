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

import { SalesOrderEntity } from './sales-order.entity';

@Entity('customers')
@Index('uq_customers_company_email', ['companyId', 'email'], {
  unique: true,
  where: '"email" IS NOT NULL AND "deleted_at" IS NULL',
})
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({
    name: 'tally_ledger_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  tallyLedgerName: string | null;

  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number.parseFloat(value),
    },
  })
  creditLimit: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany(
    () => SalesOrderEntity,
    (order: SalesOrderEntity) => order.customer,
  )
  salesOrders: SalesOrderEntity[];

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;
}
