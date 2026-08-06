import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AccountEntity } from '../../accounts/entities/account.entity';
import { CashFlowActivity } from '../enums/cash-flow-activity.enum';

@Entity('cash_flow_account_mappings')
@Index('UQ_cash_flow_mapping_company_account', ['companyId', 'accountId'], {
  unique: true,
})
@Index('IDX_cash_flow_mapping_company_activity', ['companyId', 'activity'])
export class CashFlowAccountMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => AccountEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;

  @Column({ type: 'enum', enum: CashFlowActivity })
  activity!: CashFlowActivity;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
