import { JournalEntryLineEntity } from '../../journal-entries/entities/journal-entry-line.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BankStatementLineEntity } from './bank-statement-line.entity';
const decimalTransformer = { to: (value: number | null | undefined): number | null => value ?? null, from: (value: string | number | null): number | null => value === null ? null : Number(value) };
@Entity('bank_reconciliation_matches')
@Index('IDX_bank_reconciliation_matches_statement_line', ['statementLineId'])
@Index('IDX_bank_reconciliation_matches_journal_line', ['journalEntryLineId'])
@Index('UQ_bank_reconciliation_matches_pair', ['statementLineId', 'journalEntryLineId'], { unique: true })
export class BankReconciliationMatchEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'statement_line_id', type: 'uuid' }) statementLineId!: string;
  @ManyToOne(() => BankStatementLineEntity, (line) => line.matches, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'statement_line_id' }) statementLine!: BankStatementLineEntity;
  @Column({ name: 'journal_entry_line_id', type: 'uuid' }) journalEntryLineId!: string;
  @ManyToOne(() => JournalEntryLineEntity, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'journal_entry_line_id' }) journalEntryLine!: JournalEntryLineEntity;
  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) amount!: number;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
