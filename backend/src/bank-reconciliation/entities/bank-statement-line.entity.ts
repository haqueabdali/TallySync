import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BankStatementLineStatus } from '../enums/bank-statement-line-status.enum';
import { BankReconciliationEntity } from './bank-reconciliation.entity';
import { BankReconciliationMatchEntity } from './bank-reconciliation-match.entity';
const decimalTransformer = { to: (value: number | null | undefined): number | null => value ?? null, from: (value: string | number | null): number | null => value === null ? null : Number(value) };
@Entity('bank_statement_lines')
@Index('IDX_bank_statement_lines_reconciliation', ['reconciliationId'])
@Index('IDX_bank_statement_lines_date', ['transactionDate'])
@Index('UQ_bank_statement_lines_external', ['reconciliationId', 'externalTransactionId'], { unique: true, where: '"external_transaction_id" IS NOT NULL' })
export class BankStatementLineEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'reconciliation_id', type: 'uuid' }) reconciliationId!: string;
  @ManyToOne(() => BankReconciliationEntity, (reconciliation) => reconciliation.lines, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'reconciliation_id' }) reconciliation!: BankReconciliationEntity;
  @Column({ name: 'transaction_date', type: 'date' }) transactionDate!: string;
  @Column({ name: 'value_date', type: 'date', nullable: true }) valueDate!: string | null;
  @Column({ name: 'external_transaction_id', type: 'varchar', length: 160, nullable: true }) externalTransactionId!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) reference!: string | null;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) amount!: number;
  @Column({ name: 'matched_amount', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer }) matchedAmount!: number;
  @Column({ type: 'enum', enum: BankStatementLineStatus, default: BankStatementLineStatus.UNMATCHED }) status!: BankStatementLineStatus;
  @OneToMany(() => BankReconciliationMatchEntity, (match) => match.statementLine, { eager: true }) matches!: BankReconciliationMatchEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
