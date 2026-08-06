import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DepreciationMethod } from '../enums/depreciation-method.enum';

@Entity('asset_categories')
@Index('IDX_asset_categories_company', ['companyId'])
@Index('UQ_asset_categories_company_code', ['companyId', 'code'], { unique: true, where: '"deleted_at" IS NULL' })
export class AssetCategoryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ type: 'varchar', length: 30 }) code!: string;
  @Column({ type: 'varchar', length: 150 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'asset_account_id', type: 'uuid' }) assetAccountId!: string;
  @Column({ name: 'accumulated_depreciation_account_id', type: 'uuid' }) accumulatedDepreciationAccountId!: string;
  @Column({ name: 'depreciation_expense_account_id', type: 'uuid' }) depreciationExpenseAccountId!: string;
  @Column({ name: 'depreciation_method', type: 'enum', enum: DepreciationMethod, default: DepreciationMethod.STRAIGHT_LINE }) depreciationMethod!: DepreciationMethod;
  @Column({ name: 'default_useful_life_months', type: 'integer' }) defaultUsefulLifeMonths!: number;
  @Column({ name: 'declining_balance_rate', type: 'numeric', precision: 7, scale: 4, nullable: true }) decliningBalanceRate!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
