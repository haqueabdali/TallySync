import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AssetStatus } from '../enums/asset-status.enum';
import { AssetCategoryEntity } from './asset-category.entity';

@Entity('fixed_assets')
@Index('IDX_fixed_assets_company', ['companyId'])
@Index('IDX_fixed_assets_category', ['categoryId'])
@Index('IDX_fixed_assets_status', ['companyId', 'status'])
@Index('UQ_fixed_assets_company_number', ['companyId', 'assetNumber'], { unique: true, where: '"deleted_at" IS NULL' })
export class FixedAssetEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'asset_number', type: 'varchar', length: 40 }) assetNumber!: string;
  @Column({ type: 'varchar', length: 180 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'category_id', type: 'uuid' }) categoryId!: string;
  @ManyToOne(() => AssetCategoryEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' }) category!: AssetCategoryEntity;
  @Column({ name: 'acquisition_date', type: 'date' }) acquisitionDate!: string;
  @Column({ name: 'depreciation_start_date', type: 'date' }) depreciationStartDate!: string;
  @Column({ name: 'acquisition_cost', type: 'numeric', precision: 18, scale: 4 }) acquisitionCost!: string;
  @Column({ name: 'residual_value', type: 'numeric', precision: 18, scale: 4, default: 0 }) residualValue!: string;
  @Column({ name: 'useful_life_months', type: 'integer' }) usefulLifeMonths!: number;
  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true }) serialNumber!: string | null;
  @Column({ name: 'location', type: 'varchar', length: 180, nullable: true }) location!: string | null;
  @Column({ name: 'custodian', type: 'varchar', length: 180, nullable: true }) custodian!: string | null;
  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.DRAFT }) status!: AssetStatus;
  @Column({ name: 'activation_date', type: 'date', nullable: true }) activationDate!: string | null;
  @Column({ name: 'disposal_date', type: 'date', nullable: true }) disposalDate!: string | null;
  @Column({ name: 'disposal_proceeds', type: 'numeric', precision: 18, scale: 4, nullable: true }) disposalProceeds!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
