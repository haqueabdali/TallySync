import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { CategoryEntity } from './category.entity';

export enum InventorySyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity('items')
@Index('uq_items_company_sku', ['companyId', 'sku'], {
  unique: true,
  where: '"sku" IS NOT NULL AND "deleted_at" IS NULL',
})
@Check('"sale_price" >= 0')
@Check('"purchase_price" >= 0')
@Check('"stock_qty" >= 0')
@Check('"reorder_level" >= 0')
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @Index()
  companyId: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  @Index()
  categoryId: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', length: 32, default: 'Nos' })
  unit: string;

  @Column({
    name: 'sale_price',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  salePrice: number;

  @Column({
    name: 'purchase_price',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  purchasePrice: number;

  @Column({
    name: 'stock_qty',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  stockQty: number;

  @Column({
    name: 'reorder_level',
    type: 'numeric',
    precision: 15,
    scale: 4,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  reorderLevel: number;

  @Column({
    name: 'tally_item_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  tallyItemName: string | null;

  @Column({
  name: 'sync_status',
  type: 'enum',
  enum: InventorySyncStatus,
  default: InventorySyncStatus.PENDING,
})
syncStatus: InventorySyncStatus;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => CategoryEntity, (cat) => cat.items, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity | null;
}
