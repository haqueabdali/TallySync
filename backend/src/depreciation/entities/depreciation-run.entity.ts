import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DepreciationRunStatus } from '../enums/depreciation-run-status.enum';
import { DepreciationEntryEntity } from './depreciation-entry.entity';

@Entity('depreciation_runs')
@Index('UQ_depreciation_runs_company_period', ['companyId', 'periodEnd'], { unique: true })
@Index('IDX_depreciation_runs_company_status', ['companyId', 'status'])
export class DepreciationRunEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'period_end', type: 'date' }) periodEnd!: string;
  @Column({ name: 'posting_date', type: 'date' }) postingDate!: string;
  @Column({ type: 'enum', enum: DepreciationRunStatus, default: DepreciationRunStatus.DRAFT }) status!: DepreciationRunStatus;
  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2, default: 0 }) totalAmount!: string;
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true }) journalEntryId!: string | null;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @Column({ name: 'posted_by', type: 'uuid', nullable: true }) postedBy!: string | null;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true }) postedAt!: Date | null;
  @OneToMany(() => DepreciationEntryEntity, (entry) => entry.run, { cascade: ['insert'], eager: true }) entries!: DepreciationEntryEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
