import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { InventoryRevaluationStatus } from '../enums/inventory-revaluation-status.enum';
import { InventoryRevaluationLineEntity } from './inventory-revaluation-line.entity';
const numericTransformer: ValueTransformer = { to: (value: number): number => value, from: (value: string | number): number => Number(value) };
@Entity('inventory_revaluations')
@Index('UQ_inventory_revaluations_company_number', ['companyId', 'revaluationNumber'], { unique: true })
@Index('IDX_inventory_revaluations_company_date', ['companyId', 'revaluationDate'])
export class InventoryRevaluationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'revaluation_number', type: 'varchar', length: 50 }) revaluationNumber!: string;
  @Column({ name: 'revaluation_date', type: 'date' }) revaluationDate!: string;
  @Column({ type: 'enum', enum: InventoryRevaluationStatus, enumName: 'inventory_revaluation_status_enum', default: InventoryRevaluationStatus.DRAFT }) status!: InventoryRevaluationStatus;
  @Column({ name: 'gain_account_id', type: 'uuid' }) gainAccountId!: string;
  @Column({ name: 'loss_account_id', type: 'uuid' }) lossAccountId!: string;
  @Column({ type: 'varchar', length: 3, default: 'EUR' }) currency!: string;
  @Column({ name: 'total_increase', type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numericTransformer }) totalIncrease!: number;
  @Column({ name: 'total_decrease', type: 'numeric', precision: 18, scale: 4, default: 0, transformer: numericTransformer }) totalDecrease!: number;
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'posted_by', type: 'uuid', nullable: true }) postedBy!: string | null;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true }) postedAt!: Date | null;
  @OneToMany(() => InventoryRevaluationLineEntity, (line) => line.revaluation, { cascade: ['insert'], eager: true }) lines!: InventoryRevaluationLineEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
