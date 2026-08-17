import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { ManualCostAdjustmentStatus } from '../enums/manual-cost-adjustment-status.enum';
import { ManualCostAdjustmentLineEntity } from './manual-cost-adjustment-line.entity';
const numberTransformer: ValueTransformer = { to: (value: number): number => value, from: (value: string | number): number => Number(value) };
@Entity('manual_cost_adjustments')
@Index('UQ_manual_cost_adjustments_company_number', ['companyId', 'adjustmentNumber'], { unique: true })
@Index('IDX_manual_cost_adjustments_company_date', ['companyId', 'adjustmentDate'])
export class ManualCostAdjustmentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'adjustment_number', type: 'varchar', length: 40 }) adjustmentNumber!: string;
  @Column({ name: 'adjustment_date', type: 'date' }) adjustmentDate!: string;
  @Column({ type: 'enum', enum: ManualCostAdjustmentStatus, enumName: 'manual_cost_adjustment_status_enum', default: ManualCostAdjustmentStatus.DRAFT }) status!: ManualCostAdjustmentStatus;
  @Column({ name: 'gain_account_id', type: 'uuid' }) gainAccountId!: string;
  @Column({ name: 'loss_account_id', type: 'uuid' }) lossAccountId!: string;
  @Column({ type: 'varchar', length: 3, default: 'EUR' }) currency!: string;
  @Column({ name: 'total_increase', type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numberTransformer }) totalIncrease!: number;
  @Column({ name: 'total_decrease', type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numberTransformer }) totalDecrease!: number;
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @Column({ name: 'posted_by', type: 'uuid', nullable: true }) postedBy!: string | null;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true }) postedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @OneToMany(() => ManualCostAdjustmentLineEntity, (line) => line.adjustment, { cascade: true }) lines!: ManualCostAdjustmentLineEntity[];
}
