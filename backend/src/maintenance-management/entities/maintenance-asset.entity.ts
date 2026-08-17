import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MaintenanceAssetStatus } from '../enums/maintenance-asset-status.enum';

@Entity('maintenance_assets')
@Index('UQ_maintenance_assets_company_code', ['companyId', 'assetCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('IDX_maintenance_assets_company_status', ['companyId', 'status'])
export class MaintenanceAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'asset_code', type: 'varchar', length: 100 })
  assetCode!: string;

  @Column({ name: 'asset_name', type: 'varchar', length: 200 })
  assetName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  manufacturer!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  model!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 200, nullable: true })
  serialNumber!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location!: string | null;

  @Column({
    type: 'enum',
    enum: MaintenanceAssetStatus,
    default: MaintenanceAssetStatus.ACTIVE,
  })
  status!: MaintenanceAssetStatus;

  @Column({ name: 'commissioned_date', type: 'date', nullable: true })
  commissionedDate!: string | null;

  @Column({ name: 'last_maintenance_date', type: 'date', nullable: true })
  lastMaintenanceDate!: string | null;

  @Column({ name: 'next_maintenance_date', type: 'date', nullable: true })
  nextMaintenanceDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
