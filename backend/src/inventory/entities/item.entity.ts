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
  to: (
    value: number | null | undefined,
  ): number | null | undefined => value,
  from: (
    value: string | number | null,
  ): number | null =>
    value === null ? null : Number(value),
};

/**
 * Compatibility entity for the legacy Inventory module.
 *
 * IMPORTANT:
 * This entity intentionally keeps legacy TypeScript property names such as
 * `salePrice`, `stockQty`, and `reorderLevel`, but maps them onto the same
 * PostgreSQL columns used by src/items/entities/item.entity.ts.
 *
 * This allows older inventory/manufacturing/delivery services to work against
 * the canonical `items` table without maintaining a second physical schema.
 */
@Entity('items')
@Index('idx_inventory_items_company_id', [
  'companyId',
])
@Index('idx_inventory_items_category_id', [
  'categoryId',
])
@Check(
  'chk_inventory_items_selling_price_non_negative',
  '"selling_price" >= 0',
)
@Check(
  'chk_inventory_items_purchase_price_non_negative',
  '"purchase_price" >= 0',
)
@Check(
  'chk_inventory_items_current_stock_non_negative',
  '"current_stock" >= 0',
)
@Check(
  'chk_inventory_items_minimum_stock_non_negative',
  '"minimum_stock" >= 0',
)
export class ItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'company_id',
    type: 'uuid',
  })
  companyId!: string;

  @Column({
    name: 'category_id',
    type: 'uuid',
    nullable: true,
  })
  categoryId!: string | null;

  @Column({
    type: 'varchar',
    length: 200,
  })
  name!: string;

 @Column({
  type: 'varchar',
  length: 128,
  nullable: true,
})
sku!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'PCS',
  })
  unit!: string;

  @Column({
    name: 'selling_price',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  salePrice!: number;

  @Column({
    name: 'purchase_price',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  purchasePrice!: number;

  @Column({
    name: 'current_stock',
    type: 'decimal',
    precision: 18,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  stockQty!: number;

  @Column({
    name: 'minimum_stock',
    type: 'decimal',
    precision: 18,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  reorderLevel!: number;

  @Column({
    name: 'tally_item_name',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  tallyItemName!: string | null;

  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: InventorySyncStatus,
    enumName: 'items_sync_status_enum',
    default: InventorySyncStatus.PENDING,
  })
  syncStatus!: InventorySyncStatus;

  @Column({
    name: 'last_synced_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSyncedAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;

  @ManyToOne(
    () => CategoryEntity,
    (category) => category.items,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({
    name: 'category_id',
  })
  category!: CategoryEntity | null;
}
