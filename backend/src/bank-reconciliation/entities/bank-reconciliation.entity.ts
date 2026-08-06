import { AccountEntity } from '../../accounts/entities/account.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BankReconciliationStatus } from '../enums/bank-reconciliation-status.enum';
import { BankStatementLineEntity } from './bank-statement-line.entity';

const decimalTransformer = { to: (value: number | null | undefined): number | null => value ?? null, from: (value: string | number | null): number | null => value === null ? null : Number(value) };

@Entity('bank_reconciliations')
@Index('IDX_bank_reconciliations_company', ['companyId'])
@Index('IDX_bank_reconciliations_account_period', ['companyId', 'bankAccountId', 'statementStartDate', 'statementEndDate'])
@Index('UQ_bank_reconciliations_company_reference', ['companyId', 'statementReference'], { unique: true, where: '"deleted_at" IS NULL' })
export class BankReconciliationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'bank_account_id', type: 'uuid' }) bankAccountId!: string;
  @ManyToOne(() => AccountEntity, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'bank_account_id' }) bankAccount!: AccountEntity;
  @Column({ name: 'statement_reference', type: 'varchar', length: 120 }) statementReference!: string;
  @Column({ name: 'statement_start_date', type: 'date' }) statementStartDate!: string;
  @Column({ name: 'statement_end_date', type: 'date' }) statementEndDate!: string;
  @Column({ name: 'opening_balance', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) openingBalance!: number;
  @Column({ name: 'closing_balance', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) closingBalance!: number;
  @Column({ type: 'varchar', length: 3, default: 'EUR' }) currency!: string;
  @Column({ type: 'enum', enum: BankReconciliationStatus, default: BankReconciliationStatus.DRAFT }) status!: BankReconciliationStatus;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'reconciled_by', type: 'uuid', nullable: true }) reconciledBy!: string | null;
  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true }) reconciledAt!: Date | null;
  @OneToMany(() => BankStatementLineEntity, (line) => line.reconciliation, { cascade: ['insert'], eager: true }) lines!: BankStatementLineEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
