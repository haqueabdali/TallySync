import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('warehouses')
@Index('IDX_warehouses_company', ['companyId'])
@Index('UQ_warehouses_company_code', ['companyId', 'warehouseCode'], { unique: true, where: '"deleted_at" IS NULL' })
export class WarehouseEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'warehouse_code', type: 'varchar', length: 30 }) warehouseCode!: string;
  @Column({ type: 'varchar', length: 150 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'contact_person', type: 'varchar', length: 150, nullable: true }) contactPerson!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) email!: string | null;
  @Column({ type: 'text', nullable: true }) address!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) city!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) state!: string | null;
  @Column({ name: 'postal_code', type: 'varchar', length: 30, nullable: true }) postalCode!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) country!: string | null;
  @Column({ name: 'is_default', type: 'boolean', default: false }) isDefault!: boolean;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
