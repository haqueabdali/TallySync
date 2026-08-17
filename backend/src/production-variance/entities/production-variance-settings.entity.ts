import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AccountEntity } from '../../accounts/entities/account.entity';

@Entity('production_variance_settings')
@Index('uq_production_variance_settings_company', ['companyId'], { unique: true })
export class ProductionVarianceSettingsEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'favorable_variance_account_id', type: 'uuid' }) favorableVarianceAccountId!: string;
  @Column({ name: 'unfavorable_variance_account_id', type: 'uuid' }) unfavorableVarianceAccountId!: string;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @ManyToOne(() => AccountEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'favorable_variance_account_id' }) favorableVarianceAccount!: AccountEntity;
  @ManyToOne(() => AccountEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unfavorable_variance_account_id' }) unfavorableVarianceAccount!: AccountEntity;
}
