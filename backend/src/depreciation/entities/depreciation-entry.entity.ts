import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FixedAssetEntity } from '../../asset-management/entities/fixed-asset.entity';
import { DepreciationRunEntity } from './depreciation-run.entity';

@Entity('depreciation_entries')
@Index('UQ_depreciation_entries_run_asset', ['runId', 'assetId'], { unique: true })
@Index('IDX_depreciation_entries_asset', ['companyId', 'assetId'])
export class DepreciationEntryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'run_id', type: 'uuid' }) runId!: string;
  @ManyToOne(() => DepreciationRunEntity, (run) => run.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' }) run!: DepreciationRunEntity;
  @Column({ name: 'asset_id', type: 'uuid' }) assetId!: string;
  @ManyToOne(() => FixedAssetEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' }) asset!: FixedAssetEntity;
  @Column({ name: 'months_depreciated', type: 'integer' }) monthsDepreciated!: number;
  @Column({ name: 'opening_accumulated_depreciation', type: 'numeric', precision: 18, scale: 2 }) openingAccumulatedDepreciation!: string;
  @Column({ name: 'depreciation_amount', type: 'numeric', precision: 18, scale: 2 }) depreciationAmount!: string;
  @Column({ name: 'closing_accumulated_depreciation', type: 'numeric', precision: 18, scale: 2 }) closingAccumulatedDepreciation!: string;
  @Column({ name: 'opening_net_book_value', type: 'numeric', precision: 18, scale: 2 }) openingNetBookValue!: string;
  @Column({ name: 'closing_net_book_value', type: 'numeric', precision: 18, scale: 2 }) closingNetBookValue!: string;
  @Column({ name: 'expense_account_id', type: 'uuid' }) expenseAccountId!: string;
  @Column({ name: 'accumulated_depreciation_account_id', type: 'uuid' }) accumulatedDepreciationAccountId!: string;
}
