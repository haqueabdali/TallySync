import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { CategoryEntity } from './category.entity';

export enum InventorySyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};

@Entity('items')
@Index('idx_items_company_id', ['companyId'])
@Index('idx_items_category_id', ['categoryId'])
@Index('idx_items_company_name', ['companyId', 'name'])
@Index('uq_items_company_sku', ['companyId', 'sku'], {
  unique: true,
  where: '"sku" IS NOT NULL AND "deleted_at" IS NULL',
})
@Check('chk_items_sale_price_non_negative', '"sale_price" >= 0')
@Check('chk_items_purchase_price_non_negative', '"purchase_price" >= 0')
@Check('chk_items_stock_qty_non_negative', '"stock_qty" >= 0')
@Check('chk_items_reorder_level_non_negative', '"reorder_level" >= 0')
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'Nos' })
  unit!: string;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  salePrice!: number;

  @Column({
    name: 'purchase_price',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  purchasePrice!: number;

  @Column({
    name: 'stock_qty',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  stockQty!: number;

  @Column({
    name: 'reorder_level',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  reorderLevel!: number;

  @Column({ name: 'tally_item_name', type: 'varchar', length: 255, nullable: true })
  tallyItemName!: string | null;

  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: InventorySyncStatus,
    enumName: 'inventory_sync_status_enum',
    default: InventorySyncStatus.PENDING,
  })
  syncStatus!: InventorySyncStatus;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => CategoryEntity, (category) => category.items, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity | null;
}
