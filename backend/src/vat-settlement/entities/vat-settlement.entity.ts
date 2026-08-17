import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VatReturnEntity } from '../../vat-engine/entities/vat-return.entity';
import { VatSettlementStatus } from '../enums/vat-settlement-status.enum';

const decimalTransformer = {
  to(value: number | null | undefined): number | null { return value ?? null; },
  from(value: string | number | null): number | null { return value === null ? null : Number(value); },
};

@Entity('vat_settlements')
@Index('UQ_vat_settlements_company_return', ['companyId', 'vatReturnId'], { unique: true })
@Index('IDX_vat_settlements_company_date', ['companyId', 'settlementDate'])
export class VatSettlementEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'vat_return_id', type: 'uuid' }) vatReturnId!: string;
  @ManyToOne(() => VatReturnEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vat_return_id' }) vatReturn!: VatReturnEntity;
  @Column({ name: 'settlement_date', type: 'date' }) settlementDate!: string;
  @Column({ type: 'varchar', length: 3, default: 'EUR' }) currency!: string;
  @Column({ name: 'output_tax', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) outputTax!: number;
  @Column({ name: 'input_tax', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) inputTax!: number;
  @Column({ name: 'net_tax_payable', type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer }) netTaxPayable!: number;
  @Column({ type: 'enum', enum: VatSettlementStatus, default: VatSettlementStatus.DRAFT }) status!: VatSettlementStatus;
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'posted_by', type: 'uuid', nullable: true }) postedBy!: string | null;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true }) postedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
