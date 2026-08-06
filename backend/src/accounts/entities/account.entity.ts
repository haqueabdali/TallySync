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

import { AccountNormalBalance } from '../enums/account-normal-balance.enum';
import { AccountStatus } from '../enums/account-status.enum';
import { AccountType } from '../enums/account-type.enum';

@Entity('accounts')
@Index('IDX_accounts_company', ['companyId'])
@Index('IDX_accounts_parent', ['parentId'])
@Index('IDX_accounts_type', ['companyId', 'type'])
@Index('IDX_accounts_status', ['companyId', 'status'])
@Index('UQ_accounts_company_code', ['companyId', 'code'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  code!: string;

  @Column({
    type: 'varchar',
    length: 180,
  })
  name!: string;

  @Column({
    type: 'enum',
    enum: AccountType,
  })
  type!: AccountType;

  @Column({
    name: 'normal_balance',
    type: 'enum',
    enum: AccountNormalBalance,
  })
  normalBalance!: AccountNormalBalance;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status!: AccountStatus;

  @Column({
    name: 'parent_id',
    type: 'uuid',
    nullable: true,
  })
  parentId!: string | null;

  @ManyToOne(
    () => AccountEntity,
    (account) => account.children,
    {
      nullable: true,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'parent_id' })
  parent!: AccountEntity | null;

  @OneToMany(
    () => AccountEntity,
    (account) => account.parent,
  )
  children!: AccountEntity[];

  @Column({
    name: 'is_group',
    type: 'boolean',
    default: false,
  })
  isGroup!: boolean;

  @Column({
    name: 'is_system_account',
    type: 'boolean',
    default: false,
  })
  isSystemAccount!: boolean;

  @Column({
    name: 'allow_manual_entry',
    type: 'boolean',
    default: true,
  })
  allowManualEntry!: boolean;

  @Column({
    name: 'currency',
    type: 'varchar',
    length: 3,
    default: 'EUR',
  })
  currency!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

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
