import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { ItemSyncStatus } from '../enums/item-sync-status.enum';

const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null => value ?? null,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};

@Entity('items')
@Index('IDX_items_company_id', ['companyId'])
@Index('IDX_items_category_id', ['categoryId'])
@Index('IDX_items_company_name', ['companyId', 'name'])
@Index('UQ_items_company_sku', ['companyId', 'sku'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('UQ_items_company_barcode', ['companyId', 'barcode'], {
  unique: true,
  where: '"barcode" IS NOT NULL AND "deleted_at" IS NULL',
})
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;
  @Column({ type: 'varchar', length: 50 }) sku!: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) barcode!: string | null;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 30, default: 'PCS' }) unit!: string;
  @Column({ name: 'purchase_price', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  purchasePrice!: number;
  @Column({ name: 'selling_price', type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  sellingPrice!: number;
  @Column({ name: 'tax_rate', type: 'decimal', precision: 8, scale: 2, default: 0, transformer: decimalTransformer })
  taxRate!: number;
  @Column({ name: 'opening_stock', type: 'decimal', precision: 18, scale: 3, default: 0, transformer: decimalTransformer })
  openingStock!: number;
  @Column({ name: 'current_stock', type: 'decimal', precision: 18, scale: 3, default: 0, transformer: decimalTransformer })
  currentStock!: number;
  @Column({ name: 'minimum_stock', type: 'decimal', precision: 18, scale: 3, default: 0, transformer: decimalTransformer })
  minimumStock!: number;
  @Column({ name: 'track_inventory', type: 'boolean', default: true }) trackInventory!: boolean;
  @Column({ name: 'hsn_code', type: 'varchar', length: 50, nullable: true }) hsnCode!: string | null;
  @Column({ name: 'tally_stock_item_id', type: 'varchar', length: 150, nullable: true })
  tallyStockItemId!: string | null;
  @Column({
  name: 'tally_item_name',
  type: 'varchar',
  length: 200,
  nullable: true,
})
tallyItemName!: string | null;
  @Column({ name: 'sync_status', type: 'enum', enum: ItemSyncStatus, enumName: 'items_sync_status_enum', default: ItemSyncStatus.PENDING })
  syncStatus!: ItemSyncStatus;
  @Column({ name: 'sync_error', type: 'text', nullable: true }) syncError!: string | null;
  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true }) lastSyncedAt!: Date | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;

  get isLowStock(): boolean {
    return this.trackInventory && Number(this.currentStock) <= Number(this.minimumStock);
  }

  get isOutOfStock(): boolean {
    return this.trackInventory && Number(this.currentStock) <= 0;
  }
}
