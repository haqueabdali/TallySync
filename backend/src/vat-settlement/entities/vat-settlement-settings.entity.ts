import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('vat_settlement_settings')
@Index('UQ_vat_settlement_settings_company', ['companyId'], { unique: true })
export class VatSettlementSettingsEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'output_vat_account_id', type: 'uuid' }) outputVatAccountId!: string;
  @Column({ name: 'input_vat_account_id', type: 'uuid' }) inputVatAccountId!: string;
  @Column({ name: 'vat_payable_account_id', type: 'uuid' }) vatPayableAccountId!: string;
  @Column({ name: 'vat_receivable_account_id', type: 'uuid' }) vatReceivableAccountId!: string;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
