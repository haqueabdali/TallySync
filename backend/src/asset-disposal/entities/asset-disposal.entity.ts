import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FixedAssetEntity } from '../../asset-management/entities/fixed-asset.entity';
import { AssetDisposalStatus } from '../enums/asset-disposal-status.enum';

@Entity('asset_disposals')
@Index('IDX_asset_disposals_company', ['companyId'])
@Index('UQ_asset_disposals_asset', ['assetId'], { unique: true })
export class AssetDisposalEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'asset_id', type: 'uuid' }) assetId!: string;
  @ManyToOne(() => FixedAssetEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' }) asset!: FixedAssetEntity;
  @Column({ name: 'disposal_date', type: 'date' }) disposalDate!: string;
  @Column({ name: 'disposal_proceeds', type: 'numeric', precision: 18, scale: 4, default: 0 }) disposalProceeds!: string;
  @Column({ name: 'accumulated_depreciation', type: 'numeric', precision: 18, scale: 4 }) accumulatedDepreciation!: string;
  @Column({ name: 'net_book_value', type: 'numeric', precision: 18, scale: 4 }) netBookValue!: string;
  @Column({ name: 'gain_amount', type: 'numeric', precision: 18, scale: 4, default: 0 }) gainAmount!: string;
  @Column({ name: 'loss_amount', type: 'numeric', precision: 18, scale: 4, default: 0 }) lossAmount!: string;
  @Column({ name: 'proceeds_account_id', type: 'uuid', nullable: true }) proceedsAccountId!: string | null;
  @Column({ name: 'gain_account_id', type: 'uuid' }) gainAccountId!: string;
  @Column({ name: 'loss_account_id', type: 'uuid' }) lossAccountId!: string;
  @Column({ type: 'enum', enum: AssetDisposalStatus, default: AssetDisposalStatus.DRAFT }) status!: AssetDisposalStatus;
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true }) journalEntryId!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by', type: 'uuid' }) createdBy!: string;
  @Column({ name: 'posted_by', type: 'uuid', nullable: true }) postedBy!: string | null;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true }) postedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
